import json
import math

import numpy as np
from typing import List
from matplotlib import pyplot as plt

DELTA = 0.5
DELTA2 = 0.0001
ANGLE = 8




class Point:
    def __init__(self, latitude: float, longitude: float):
        self.latitude = latitude
        self.longitude = longitude

    def __repr__(self):
        return f"Latitude: {self.latitude}, Longitude: {self.longitude}"


class Segment:
    def __init__(self, points: List[Point]):
        self.points: List[Point] = points

    def add_point(self, point: Point):
        self.points.append(point)

    def distance_between_points(self, point1: Point, point2: Point) -> float:
        # for latitude and longitude in meters
        R = 6371000
        phi1 = np.radians(point1.latitude)
        phi2 = np.radians(point2.latitude)
        delta_phi = np.radians(point2.latitude - point1.latitude)
        delta_lambda = np.radians(point2.longitude - point1.longitude)
        a = np.sin(delta_phi / 2) * np.sin(delta_phi / 2) + np.cos(phi1) * np.cos(phi2) * np.sin(
            delta_lambda / 2) * np.sin(delta_lambda / 2)
        c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
        return R * c

    def get_distance(self) -> float:
        distance = 0
        for i in range(len(self.points) - 1):
            distance += self.distance_between_points(self.points[i], self.points[i + 1])
        return distance

    def __getitem__(self, index: int) -> Point:
        return self.points[index]

    def __repr__(self) -> str:
        return f"Start: {self.points[0].latitude}, {self.points[0].longitude}, End: {self.points[-1].latitude}, {self.points[-1].longitude}, Distance: {self.get_distance()}, Points: {len(self.points)}"


class SegmentsManager:
    def __init__(self, data: List[Point]):
        self.data = data
        self.segments = self.get_segments()

    def get_angle2(self, point1: Point, point2: Point, point3: Point) -> float:
        x1, y1 = point1.latitude, point1.longitude
        x2, y2 = point2.latitude, point2.longitude
        x3, y3 = point3.latitude, point3.longitude
        if x1 == x2 or x2 == x3 or x1 == x3:
            return 0

        vector_AB = (x2 - x1, y2 - y1)
        vector_BC = (x3 - x2, y3 - y2)

        # Calculate dot product
        dot_product = vector_AB[0] * vector_BC[0] + vector_AB[1] * vector_BC[1]

        # Calculate magnitudes
        magnitude_AB = math.sqrt(vector_AB[0]**2 + vector_AB[1]**2)

        magnitude_BC = math.sqrt(vector_BC[0]**2 + vector_BC[1]**2)


        # Calculate angle in radians
        product = dot_product / (magnitude_AB * magnitude_BC)
        if product > 1:
            angle_radians = 0
        elif product < -1:
            angle_radians = math.pi
        else:
            angle_radians = math.acos(dot_product / (magnitude_AB * magnitude_BC))

        # Convert angle to degrees
        angle_degrees = math.degrees(angle_radians)
        return angle_degrees

    def are_collinear(self, point1: Point, point2: Point, point3: Point, delta: float = DELTA) -> bool:
        return self.get_angle2(point1, point2, point3) < ANGLE



    def get_segments(self) -> List[Segment]:
        segments: List[Segment] = []
        s = Segment([self.data[0], self.data[1]])
        i = 2
        while True:
            if self.are_collinear(s[-2], s[-1], self.data[i]):
                s.add_point(self.data[i])
            elif self.are_collinear(s[-2], s[-1], self.data[i + 1]):
                #ANOMALY DELETION
                s.add_point(self.data[i + 1])
                i += 1
            else:

                total = sum(s.distance_between_points(s[i - 1], s[i]) for i in range(1, len(s.points)))
                print(total)
                if total >= 30:
                    segments.append(s)
                s = Segment([self.data[i], self.data[i + 1]])
                i += 1
            i += 1
            if i >= len(self.data) - 2:
                break
        return segments

    def print_segments(self):
        for index, segment in enumerate(self.segments):
            print(f"Segment {index + 1}: {segment}")

    def get_segments_gte(self, distance: float = 0) -> List[Segment]:
        return [segment for segment in self.segments if segment.get_distance() >= distance]


def remove_succeded_duplicates(data: List[Point]) -> List[Point]:
    das = []
    for i in range(len(data)):
        if i == 0:
            das.append(data[i])
            continue
        if data[i].longitude != das[-1].longitude or data[i].latitude != das[-1].latitude:
            das.append(data[i])
    return das


class PlotManager:

    
    def plot_segments(segments: List[Segment]):
        for segment in segments:
            x = [point.latitude for point in segment.points]
            y = [point.longitude for point in segment.points]
            plt.plot(x, y)  
        plt.show()  

   
    def plot_points(points: List[Point]):
        x = [point.latitude for point in points]
        y = [point.longitude for point in points]
        plt.plot(x, y) 
        plt.show() 


class ReaderManager:
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.data = None
        self.df = None

    def read_json(self):
        with open(self.file_path, 'r') as f:
            self.data = json.load(f)
        return self.data


def main():
    data = ReaderManager("data.json").read_json()
    points = [Point(item["data"]["latitude"], item["data"]["longitude"]) for item in data]
    points = remove_succeded_duplicates(points)
    
    print(max(points, key=lambda x: x.longitude))
    segments_manager = SegmentsManager(points)
    segments_manager.print_segments()
    PlotManager.plot_segments(segments_manager.get_segments_gte(0))

if __name__ == "__main__":
    main()
