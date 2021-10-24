function getPotentiaLinesPointsFromWall(startPoint, endPoint, dataStructures, selectedLine) {
      let room = getPotentialRoomFromLine(startPoint, endPoint, dataStructures, selectedLine);

      //console.log(room);

      if (!room) {
          return null;
      }

      let doorWalls = dataStructureFactory.getDoorsWallsPotentialFromRoomPotential(room, dataStructures);
      let points = dataStructureFactory.getPointsFromRooms([room]);

      return {
          lines: doorWalls,
          points: points
      }
}

function getPotentialRoomFromLine(startPoint, endPoint, dataStructures, line) {
  // Vertical
  if (line.start.x === line.end.x) {
      let deltaX = endPoint.x - startPoint.x;

      if (Math.abs(deltaX) < 5) {
          return null;
      }

      let xToConsider = line.start.x + deltaX;

      let closestPointsX = -1;
      for (let i=0; i<dataStructures.pointsSortedX.length; i++) {
          if (
            Math.abs(dataStructures.pointsSortedX[i].x - xToConsider)
            < Math.abs(closestPointsX - xToConsider)
          ) {
              closestPointsX = dataStructures.pointsSortedX[i].x;
          }
      }

      let xToUse = -1;
      if (Math.abs(xToConsider - closestPointsX) < 5) {
          xToUse = closestPointsX;
      } else {
          xToUse = xToConsider;
      }

      if (deltaX > 0) {
          return {
              id: null,
              leftX: line.start.x,
              rightX: xToUse,
              leftCeilingY: line.start.y,
              rightCeilingY: line.start.y,
              leftFloorY: line.end.y,
              rightFloorY: line.end.y,
          };
      } else {
          return {
              id: null,
              leftX: xToUse,
              rightX: line.start.x,
              leftCeilingY: line.start.y,
              rightCeilingY: line.start.y,
              leftFloorY: line.end.y,
              rightFloorY: line.end.y,
          };
      }
  // Horizontal
  } else {
      let deltaY = endPoint.y - startPoint.y;

      if (Math.abs(deltaY) < 5) {
          return null;
      }

      let yToConsiderA = line.start.y + deltaY;
      let yToConsiderB = line.end.y + deltaY;

      let closestPointAsY = -1;
      for (let i=0; i<dataStructures.pointsSortedY.length; i++) {
          if (
            Math.abs(dataStructures.pointsSortedY[i].y - yToConsiderA)
            < Math.abs(closestPointAsY - yToConsiderA)
          ) {
              closestPointAsY = dataStructures.pointsSortedY[i].y;
          }
      }

      let closestPointBsY = -1;
      for (let i=0; i<dataStructures.pointsSortedY.length; i++) {
          if (
            Math.abs(dataStructures.pointsSortedY[i].y - yToConsiderB)
            < Math.abs(closestPointBsY - yToConsiderB)
          ) {
              closestPointBsY = dataStructures.pointsSortedY[i].y;
          }
      }

      let deltaYToUse = -1;
      if (Math.abs(yToConsiderA - closestPointAsY) < 5) {
          deltaYToUse = closestPointAsY - line.start.y;
      } else if (Math.abs(yToConsiderB - closestPointBsY) < 5) {
          deltaYToUse = closestPointBsY - line.end.y;
      } else {
          deltaYToUse = deltaY;
      }

      return (dataStructureFactory.getSortedRoomFromDimensions(
          line.start.x, line.end.x,
          line.start.y, line.end.y,
          line.start.y + deltaYToUse, line.end.y + deltaYToUse
      ));
  }
}

function getPotentialRoomFromPoints(startPoint, endPoint, dataStructures) {

      let deltaX = endPoint.x - startPoint.x;

      if (Math.abs(deltaX) < 5) {
          return null;
      }

      let deltaY = endPoint.y - startPoint.y;

      if (Math.abs(deltaY) < 5) {
          return null;
      }



      let xToConsider = endPoint.x;

      let closestPointsX = -1;
      for (let i=0; i<dataStructures.pointsSortedX.length; i++) {
          if (
            Math.abs(dataStructures.pointsSortedX[i].x - xToConsider)
            < Math.abs(closestPointsX - xToConsider)
          ) {
              closestPointsX = dataStructures.pointsSortedX[i].x;
          }
      }

      let xToUse = -1;
      if (Math.abs(xToConsider - closestPointsX) < 5) {
          xToUse = closestPointsX;
      } else {
          xToUse = xToConsider;
      }


      let yToConsider = endPoint.y;

      let closestPointsY = -1;
      for (let i=0; i<dataStructures.pointsSortedY.length; i++) {
          if (
            Math.abs(dataStructures.pointsSortedY[i].y - yToConsider)
            < Math.abs(closestPointsY - yToConsider)
          ) {
              closestPointsY = dataStructures.pointsSortedY[i].y;
          }
      }

      let yToUse = -1;
      if (Math.abs(yToConsider - closestPointsY) < 5) {
          yToUse = closestPointsY;
      } else {
          yToUse = yToConsider;
      }


      if (deltaX > 0) {
          return (dataStructureFactory.getSortedRoomFromDimensions(
              startPoint.x, xToUse,
              startPoint.y, startPoint.y,
              yToUse, yToUse
          ));
      } else {
        return (dataStructureFactory.getSortedRoomFromDimensions(
            xToUse, startPoint.x,
            startPoint.y, startPoint.y,
            yToUse, yToUse
        ));
      }

}

function getPotentiaLinesPointsFromPoints(startPoint, endPoint, dataStructures) {
      let room = getPotentialRoomFromPoints(
        startPoint,
        endPoint,
        dataStructures,
      );

      if (!room) {
          return null;
      }

      let doorsWalls = dataStructureFactory.getDoorsWallsPotentialFromRoomPotential(room, dataStructures);
      let points = dataStructureFactory.getPointsFromRooms([room]);

      return {
          lines: doorWalls,
          points: points
      }
}

function roomOverlaps(linesPoints, dataStructures) {
/*
    for (const potentialLine of linesPoints.lines) {
        //check if this potentialRoom contains any existing points
        for (const pointKey in dataStructures.metaroomDisk.rooms) {

        }
        //check if any potentialLine crosses any existing line
        for (const lineKey in dataStructures.metaroomDisk.rooms) {

        }
    }
*/
    return false;
}

function getPotentialRoom(ui, selection, dataStructures) {
    let room = null;
    if (ui.dragging.isDragging) {
        if (selection.selectedType === "point" || selection.selectedType === "corner") {
            if (ui.shiftKeyIsDown) {
                room = getPotentialRoomFromPoints(
                  ui.dragging.startDragging,
                  ui.dragging.stopDragging,
                  dataStructures,
                );

            }
        } else if (selection.selectedType === "door") {
            Function.prototype();

        } else if (selection.selectedType === "wall") {
            if (ui.shiftKeyIsDown) {
                let selectedLine = dataStructures.walls[selection.selectedId];
                room = getPotentialRoomFromLine(ui.dragging.startDragging, ui.dragging.stopDragging, dataStructures, selectedLine);
            }
        } else if (selection.selectedType === "room") {
            Function.prototype();
        } else {
            if (ui.shiftKeyIsDown) {
                room = getPotentialRoomFromPoints(
                  ui.dragging.startDragging,
                  ui.dragging.stopDragging,
                  dataStructures,
                );
            }
        }
    }
    return room;
}

module.exports = {
    potentialFactory: {
        getPotentialRoom: getPotentialRoom
    }
}
