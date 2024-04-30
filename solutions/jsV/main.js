const fs = require("fs");
const Big = require("big.js");
// const { addAbortListener } = require('events');

const usecase = 23;
const DELTA = 0.5;
const DELTA2 = 0.0001;
const ANGLE = 8;
const RELATIVE_LATITUDE = 47.501303;
const RELATIVE_LONGITUDE = 27.362475;
const R = 6371000;


class Point {
	constructor(latitude, longitude) {
		this.latitude = latitude;
		this.longitude = longitude;
	}
	toString() {
		return `Latitude: ${this.latitude}, Longitude: ${this.longitude}`;
	}
}

class Segment {
	constructor(points) {
		this.points = points;
	}

	addPoint(point) {
		this.points.push(point);
	}

	distanceBetweenPoints(point1, point2) {
		// for latitude and longitude in meters
		const R = 6371000;
		const phi1 = this.degreesToRadians(point1.latitude);
		const phi2 = this.degreesToRadians(point2.latitude);
		const deltaPhi = this.degreesToRadians(
			point2.latitude - point1.latitude
		);
		const deltaLambda = this.degreesToRadians(
			point2.longitude - point1.longitude
		);
		const a =
			Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
			Math.cos(phi1) *
				Math.cos(phi2) *
				Math.sin(deltaLambda / 2) *
				Math.sin(deltaLambda / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return R * c;
	}

	getDistance() {
		let distance = 0;
		for (let i = 0; i < this.points.length - 1; i++) {
			distance += this.distanceBetweenPoints(
				this.points[i],
				this.points[i + 1]
			);
		}
		return distance;
	}

	degreesToRadians(degrees) {
		return (degrees * Math.PI) / 180;
	}

	toString() {
		return `Start: ${this.points[0].latitude}, ${
			this.points[0].longitude
		}, End: ${this.points[this.points.length - 1].latitude}, ${
			this.points[this.points.length - 1].longitude
		}, Distance: ${this.getDistance()}, Points: ${this.points.length}`;
	}
}

class SegmentsManager {
	constructor(data) {
		this.data = data;
		this.segments = this.getSegments();
	}

	getAngle(point1, point2, point3) {
		const x1 = new Big(point1.latitude);
		const y1 = new Big(point1.longitude);
		const x2 = new Big(point2.latitude);
		const y2 = new Big(point2.longitude);
		const x3 = new Big(point3.latitude);
		const y3 = new Big(point3.longitude);

		if (x1.eq(x2) || x2.eq(x3) || x1.eq(x3)) return 0;

		const vectorAB = [new Big(x2).minus(x1), new Big(y2).minus(y1)];
		const vectorBC = [new Big(x3).minus(x2), new Big(y3).minus(y2)];

		const dotProduct = new Big(
			new Big(vectorAB[0]).times(vectorBC[0])
		).plus(new Big(vectorAB[1]).times(vectorBC[1]));

		const prodAb = vectorAB[0].pow(2).plus(vectorAB[1].pow(2));
		const magnitudeAB = prodAb.sqrt();
		
		const prodBC = vectorBC[0].pow(2).plus(vectorBC[1].pow(2));
		const magnitudeBC = (prodBC).sqrt();

		let product = new Big(dotProduct).div(
			new Big(magnitudeAB).times(magnitudeBC)
		);
		if (new Big(product).gt(1)) product = new Big(1);
		else if (new Big(product).lt(-1)) product = new Big(-1);

		const angleRadians = new Big(Math.acos(product));
		const angleDegrees = new Big(angleRadians).times(
			new Big(180).div(new Big(Math.PI))
		);
		return angleDegrees;
	}

	areCollinear(point1, point2, point3, delta = DELTA) {
		return this.getAngle(point1, point2, point3) < ANGLE;
	}

	getSegments() {
		const segments = [];
		let s = new Segment([this.data[0], this.data[1]]);
		let i = 2;
		while (true) {
			if (
				this.areCollinear(
					s.points[s.points.length - 2],
					s.points[s.points.length - 1],
					this.data[i]
				) === true
			) {
				s.addPoint(this.data[i]);
			} else if (
				this.areCollinear(
					s.points[s.points.length - 2],
					s.points[s.points.length - 1],
					this.data[i + 1]
				) === true
			) {
				s.addPoint(this.data[i + 1]);
				i++;
			} else {
				let total = 0;
				for (let j = 1; j < s.points.length; j++) {
					total += s.distanceBetweenPoints(
						s.points[j - 1],
						s.points[j]
					);
				}
				if (total >= 30) {
					segments.push(s);
				}
				s = new Segment([this.data[i], this.data[i + 1]]);
				i++;
			}
			i++;
			if (i >= this.data.length - 2) break;
		}
		return segments;
	}

	printSegments() {
		this.segments.forEach((segment, index) => {
			console.log(`Segment ${index + 1}: ${segment}`);
		});
	}

	getSegmentsGte(distance = 0) {
		return this.segments.filter(
			(segment) => segment.getDistance() >= distance
		);
	}
}

function removeSucceededDuplicates(data) {
	const das = [];
	for (let i = 0; i < data.length; i++) {
		if (i === 0) {
			das.push(data[i]);
			continue;
		}
		if (
			data[i].longitude !== das[das.length - 1].longitude ||
			data[i].latitude !== das[das.length - 1].latitude
		) {
			das.push(data[i]);
		}
	}
	return das;
}

class ReaderManager {
	constructor(filePath) {
		this.filePath = filePath;
		this.data = null;
		this.df = null;
	}

	readJson() {
		try {
			const jsonData = fs.readFileSync(this.filePath, "utf8");
			this.data = JSON.parse(jsonData);
			return this.data;
		} catch (err) {
			console.error("Error reading JSON file:", err);
			return null;
		}
	}
}

function main(jsonPath) {
	const readerManager = new ReaderManager(jsonPath);
	const data = readerManager.readJson();
	if (data) {
		let points = data.map(
			(item) => new Point(item.data.latitude, item.data.longitude)
		);
		points = removeSucceededDuplicates(points);
		const segmentsManager = new SegmentsManager(points);
		segmentsManager.printSegments();
	} else {
		console.log("Error reading JSON data.");
	}
}




for(let i = 1; i < 86; i++){
	console.log("Usecase " + i + "<---------------->");
	main(`./src/case${i}/data.json`);
}