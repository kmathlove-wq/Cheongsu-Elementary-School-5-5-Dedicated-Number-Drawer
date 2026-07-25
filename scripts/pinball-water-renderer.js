export function createPinballWaterRenderer({
  ctx,
  pinballMap,
  pegThick,
  ballRadius,
  getWaterLiftBounds,
  getWaterClimbPoint,
}) {
  function drawWaterLift(
    lift,
    getX = (value) => value,
    getY = (value) => value,
    detailed = true
  ) {
    const points = [];
    const steps = detailed ? 28 : 12;
    for (let index = 0; index <= steps; index++) {
      const y =
        lift.topY +
        (lift.bottomY - lift.topY) * index / steps;
      points.push({ y, ...getWaterLiftBounds(lift, y) });
    }

    ctx.save();
    ctx.fillStyle = detailed
      ? 'rgba(30, 170, 255, 0.28)'
      : 'rgba(30, 170, 255, 0.55)';
    ctx.strokeStyle = lift.color;
    ctx.lineWidth = detailed ? Math.max(3, pegThick * 0.55) : 1.4;
    ctx.shadowBlur = detailed ? 22 : 3;
    ctx.shadowColor = lift.color;
    ctx.beginPath();
    ctx.moveTo(getX(points[0].left), getY(points[0].y));
    points.forEach((point) => {
      ctx.lineTo(getX(point.left), getY(point.y));
    });
    for (let index = points.length - 1; index >= 0; index--) {
      ctx.lineTo(getX(points[index].right), getY(points[index].y));
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const inlet = getWaterLiftBounds(
      lift,
      lift.bottomY,
      lift.inletWidthRatio
    );
    ctx.lineWidth = detailed ? Math.max(7, pegThick) : 2;
    ctx.beginPath();
    ctx.moveTo(getX(inlet.left), getY(inlet.y));
    ctx.lineTo(getX(inlet.right), getY(inlet.y));
    ctx.stroke();

    if (detailed) {
      const now = performance.now() * 0.001;
      const span = lift.bottomY - lift.topY;
      ctx.fillStyle = 'rgba(210, 250, 255, 0.82)';
      for (let index = 0; index < 16; index++) {
        const progress =
          (now * (0.12 + index % 3 * 0.025) + index / 16) % 1;
        const y = lift.bottomY - span * progress;
        const water = getWaterLiftBounds(lift, y);
        const wave = Math.sin(now * 2.4 + index * 1.7);
        const x =
          water.center + wave * (water.right - water.left) * 0.34;
        ctx.beginPath();
        ctx.arc(x, y, 3 + index % 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = '#e7fbff';
      ctx.lineWidth = 4;
      for (let index = 1; index <= 4; index++) {
        const y = lift.topY + span * index / 5;
        const water = getWaterLiftBounds(lift, y);
        const size = Math.max(9, ballRadius * 0.55);
        ctx.beginPath();
        ctx.moveTo(water.center - size, y + size * 0.55);
        ctx.lineTo(water.center, y - size * 0.45);
        ctx.lineTo(water.center + size, y + size * 0.55);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawWaterClimb(
    climb,
    getX = (value) => value,
    getY = (value) => value,
    detailed = true,
    widthScale = 1
  ) {
    const getCourseEdges = (pathPoints, connectEnds = false) => {
      const lastIndex = pathPoints.length - 1;
      const blendCount = Math.max(3, Math.floor(lastIndex * 0.08));
      const left = [];
      const right = [];
      for (let index = 0; index <= lastIndex; index++) {
        const point = pathPoints[index];
        const before = pathPoints[Math.max(0, index - 1)];
        const after = pathPoints[Math.min(lastIndex, index + 1)];
        const angle = Math.atan2(
          after.y - before.y,
          after.x - before.x
        );
        const entryBlend = connectEnds
          ? Math.max(0, 1 - index / blendCount) ** 2
          : 0;
        const exitBlend = connectEnds
          ? Math.max(0, 1 - (lastIndex - index) / blendCount) ** 2
          : 0;
        const halfWidth = (
          climb.width +
          (climb.entryWidth - climb.width) * entryBlend +
          (climb.resumeWidth - climb.width) * exitBlend
        ) * widthScale / 2;
        const nx = -Math.sin(angle);
        const ny = Math.cos(angle);
        left.push({
          x: getX(point.x) + nx * halfWidth,
          y: getY(point.y) + ny * halfWidth,
        });
        right.push({
          x: getX(point.x) - nx * halfWidth,
          y: getY(point.y) - ny * halfWidth,
        });
      }
      if (connectEnds) {
        const entry = climb.points[0];
        const entryLane = pinballMap.course.at(entry.y);
        const entryCenter =
          entryLane.left +
          (entryLane.right - entryLane.left) * climb.entryPosition;
        left[0] = {
          x: getX(entryCenter - climb.entryWidth / 2),
          y: getY(entry.y),
        };
        right[0] = {
          x: getX(entryCenter + climb.entryWidth / 2),
          y: getY(entry.y),
        };
        const exit = climb.resumePoint;
        const exitLane = pinballMap.course.at(exit.y);
        const exitCenter =
          exitLane.left +
          (exitLane.right - exitLane.left) * climb.resumePosition;
        left[lastIndex] = {
          x: getX(exitCenter - climb.resumeWidth / 2),
          y: getY(exit.y),
        };
        right[lastIndex] = {
          x: getX(exitCenter + climb.resumeWidth / 2),
          y: getY(exit.y),
        };
      }
      return { left, right };
    };

    const traceCenterline = (
      points,
      start = 0,
      end = points.length - 1
    ) => {
      ctx.beginPath();
      ctx.moveTo(getX(points[start].x), getY(points[start].y));
      for (const point of points.slice(start + 1, end + 1)) {
        ctx.lineTo(getX(point.x), getY(point.y));
      }
    };
    const drawCourseArea = (edges) => {
      ctx.beginPath();
      ctx.moveTo(edges.left[0].x, edges.left[0].y);
      edges.left.slice(1).forEach((point) => {
        ctx.lineTo(point.x, point.y);
      });
      for (let index = edges.right.length - 1; index >= 0; index--) {
        ctx.lineTo(edges.right[index].x, edges.right[index].y);
      }
      ctx.closePath();
    };

    const routeEdges = getCourseEdges(climb.points, true);
    const waterEdges = climb.kind === 'water'
      ? getCourseEdges(climb.waterPath.points)
      : null;
    const connectorCount = Math.max(
      3,
      Math.floor((climb.points.length - 1) * 0.08)
    );
    const routeLast = climb.points.length - 1;
    const borderWidth = detailed ? Math.max(6, pegThick) : 2;
    const routeWidth = climb.width * widthScale;
    const drawConnector = (start, end) => {
      ctx.beginPath();
      ctx.moveTo(routeEdges.left[start].x, routeEdges.left[start].y);
      for (let index = start + 1; index <= end; index++) {
        ctx.lineTo(routeEdges.left[index].x, routeEdges.left[index].y);
      }
      for (let index = end; index >= start; index--) {
        ctx.lineTo(routeEdges.right[index].x, routeEdges.right[index].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = pinballMap.course.color;
      ctx.lineWidth = borderWidth;
      for (const side of ['left', 'right']) {
        ctx.beginPath();
        ctx.moveTo(routeEdges[side][start].x, routeEdges[side][start].y);
        for (let index = start + 1; index <= end; index++) {
          ctx.lineTo(routeEdges[side][index].x, routeEdges[side][index].y);
        }
        ctx.stroke();
      }
    };

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'butt';
    ctx.shadowBlur = detailed ? 16 : 2;
    ctx.shadowColor = pinballMap.course.color;
    ctx.fillStyle = detailed
      ? 'rgba(12,20,32,0.82)'
      : 'rgba(30,45,65,0.78)';
    drawConnector(0, connectorCount);
    drawConnector(routeLast - connectorCount, routeLast);

    ctx.strokeStyle = pinballMap.course.color;
    ctx.lineWidth = routeWidth + borderWidth * 2;
    traceCenterline(
      climb.points,
      connectorCount,
      routeLast - connectorCount
    );
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = detailed
      ? 'rgba(12,20,32,0.96)'
      : 'rgba(30,45,65,0.94)';
    ctx.lineWidth = routeWidth;
    traceCenterline(
      climb.points,
      connectorCount,
      routeLast - connectorCount
    );
    ctx.stroke();

    if (waterEdges) {
      ctx.lineCap = 'round';
      ctx.shadowBlur = detailed ? 22 : 3;
      ctx.shadowColor = climb.color;
      ctx.strokeStyle = detailed
        ? 'rgba(18, 151, 222, 0.90)'
        : 'rgba(28, 167, 238, 0.94)';
      ctx.lineWidth = Math.max(2, routeWidth - borderWidth * 0.35);
      traceCenterline(climb.waterPath.points);
      ctx.stroke();
    }

    if (detailed && waterEdges) {
      ctx.save();
      drawCourseArea(waterEdges);
      ctx.clip();
      const now = performance.now() * 0.001;
      ctx.fillStyle = 'rgba(220, 252, 255, 0.86)';
      for (let index = 0; index < 18; index++) {
        const progress =
          (now * (0.09 + index % 4 * 0.018) + index / 18) % 1;
        const point = getWaterClimbPoint(
          climb.waterPath,
          climb.waterPath.totalLength * progress
        );
        const offset =
          Math.sin(now * 2.2 + index * 1.8) * climb.width * 0.30;
        const nx = -Math.sin(point.angle);
        const ny = Math.cos(point.angle);
        ctx.beginPath();
        ctx.arc(
          point.x + nx * offset,
          point.y + ny * offset,
          3 + index % 5,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      ctx.strokeStyle = '#effdff';
      ctx.lineWidth = 4;
      for (let index = 1; index <= 5; index++) {
        const point = getWaterClimbPoint(
          climb.waterPath,
          climb.waterPath.totalLength * index / 6
        );
        const size = Math.max(9, ballRadius * 0.5);
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(point.angle);
        ctx.beginPath();
        ctx.moveTo(-size * 0.5, -size);
        ctx.lineTo(size * 0.5, 0);
        ctx.lineTo(-size * 0.5, size);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  return { drawWaterLift, drawWaterClimb };
}
