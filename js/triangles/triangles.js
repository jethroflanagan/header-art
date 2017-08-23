define(
[
	'jquery',
	'greensock/TweenMax.min',
	'base/core',
	'base/math_utils',
	'base/filter',
	'triangles/shapes'
], function($, tweenMaxNULL, core, mathUtils, filter, shapeLib) //tweenMaxNULL is an empty variable - tweenMax breaks in require. This is a messy fix
{
	var FLIP_INVERT = "invert";
	var FLIP_LEFT = "left";
	var FLIP_RIGHT = "right";
	var NO_FLIP = "none";
	var RECORD = "record";
	var PLAYBACK = "playback";
	var DESTRUCT = "destruct";
	var NO_HIDE = "no_hide";
	var HIDE_BEFORE = "hide_before";
	var HIDE_AFTER = "hide_after";

	var showShapeTime = 1000; //in milliseconds. Time for shape to stay on screen once fully rebuilt
	var shapes;
	var shapeId;
	var canvas;
	var context;
	var flipTime = 1; //seconds, time per triangle to flip over
	var waveTime = 1; //seconds, max time for all triangles to flip over (may end up taking less)
	var size = 18;
	var height = size * Math.sqrt(3)/2;
	var horizontalPadding = 2;
	var verticalPadding = 1;
    var triangles;
    var nextTriangles;
	var mergedTriangles; //the triangle positions that bridge the animation between shapes
	var timesteps = 1000 / 30;
	var playbackQueue = [];
	var hasDestructed;
	var shadowBlur;
	var shapeRange;
	var numDestructs;
	var shapeReconstructedCallback;
	var isPaused = false;
	var pauseCallback; //runs this when unpausing

	function init(target)
	{
		window.canvas = document.getElementById(target);
		window.context = window.canvas.getContext("2d");
		canvas = window.canvas;
		context = window.context;
		shadowBlur = filter(canvas, context);
		mergedTriangles = [];
		shapes = shapeLib.shapes;

		window.addEventListener("mousedown", pause);
		window.addEventListener("mouseup", play);
	}

	function setShapeReconstructedCallback(callback)
	{
		shapeReconstructedCallback = callback;
	}

	function pause()
	{
		isPaused = true;
	}

	function play()
	{
		isPaused = false;
		if (pauseCallback != null)
		{
			pauseCallback();
		}
		pauseCallback = null;
	}

	function showShapeId(id)
	{
		shapeId = shapeLib.getShapeFromId(id);
		triangles = getTriangles(shapeId);
		destructShape();
	}

	function clear()
	{
		context.clearRect(0, 0, canvas.width, canvas.height);
	}

	function destructShape(doReconstruction)
	{
		if (doReconstruction === undefined)
			doReconstruction = true;
		hasDestructed = false;
		calculateDestructedShape();
		//drawTriangles(triangles);
		if (doReconstruction)
			reconstructShape(true);
	}

	function calculateDestructedShape()
	{
		var numDestructs = Math.floor(Math.random() * 2) + 1;
		for (var i = 0; i < numDestructs - 1; i++)
			flipTriangles(RECORD);
		flipTriangles(RECORD, NO_HIDE, null, true);
	}

	function reconstructShape(firstTime)
	{
		if (isPaused)
		{
			pauseCallback = function()
				{
					reconstructShape(firstTime);
				}
			return;
		}
		if (playbackQueue.length > 0)
		{
			if (firstTime == undefined)
				firstTime = false;
			flipTriangles(
				PLAYBACK,
				(firstTime ? HIDE_BEFORE : NO_HIDE),
				reconstructShape);
		}
		else
		{
			if (shapeReconstructedCallback != null)
				shapeReconstructedCallback();
		}
		mergedTriangles = [];
	}

	function destructToShapeId(id)
	{
		if (!hasDestructed) //break the shape apart
		{
			numDestructs = Math.floor(Math.random() * 2) + 1;
			hasDestructed = true;
			setTimeout(function()
			{
				hideShape(id);
			}, showShapeTime);
		}
	}

	/**
	 * After showing the previous shape for X time, this function will make the triangles destruct in animation (move away from the shape)
	 */
	function hideShape(id)
	{
		if (isPaused)
		{
			pauseCallback = function()
				{
					hideShape(id);
				}
			return;
		}
		if (numDestructs-- > 0)
		{
			flipTriangles(DESTRUCT, NO_HIDE, function()
				{
					hideShape(id)
				});
		}
		else
		{
			//need to destruct these in order to find target, so store them to replace back afterwards
			var currentTriangles = core.clone(triangles);
			shapeId = shapeLib.getShapeFromId(id);
			triangles = getTriangles(shapeId);

			calculateDestructedShape();

			nextTriangles = core.clone(triangles);
			var queue = core.clone(playbackQueue);

			//set everything back to how it was
			triangles = currentTriangles;

			flipTriangles(DESTRUCT, HIDE_AFTER, function(){
				playbackQueue = queue;
				showNext();
				});
		}
	}

	function showNext()
	{
		triangles = nextTriangles;
		nextTriangles = [];
		hasDestructed = false;
		reconstructShape(true);
	}

	function getRandomShapeId()
	{
		var rangeSize = shapeRange.max - shapeRange.min;
		var list = [];
		for (var i = 0; i <= rangeSize; i++)
		{
			list.push(shapeRange.min + i);
		}
		if (shapeId != null && shapeId != undefined)
			list.splice(list.indexOf(shapeId), 1);
		var id = list[Math.round(Math.random() * (list.length - 1))];
		//core.log(list);
		return id;
	}

	/**
	 * @param mode      int         [PLAYBACK,RECORD]
	 *        In RECORD mode, (opposite) directions each triangle moves will be added to a queue. The direction of motion is chosen randomly
	 *        In PLAYBACK mode, the queued directions will be played so that the shape reconstructs itself
	 *        In DESTRUCT mode, the triangles will move in a random direction (same as RECORD, but not added to queue, and is animated)
	 * @param hideMode Boolean
	 *        If true, triangles will hideThemselves by setting to their color to the background color halfway through flipping
	 */
	function flipTriangles(mode, hideMode, onComplete, forceAllMove)
	{
		var wait = 0;

		if (forceAllMove == undefined)
			forceAllMove = false;
		if (hideMode == undefined)
			hideMode = NO_HIDE;
		var totalFlipTime = 0;
		var queueLayer;
		if (mode == RECORD) //add a queue layer
		{
			playbackQueue.push([]);
			queueLayer = playbackQueue[playbackQueue.length - 1];
		}
		else //remove the last queue layer
		{
			queueLayer = playbackQueue.pop();
		}

		for (var index = 0; index < triangles.length; index++)
		{
			if (mode == RECORD)
				queueLayer.push([]);
			var triangle = triangles[index];
			var directions = [FLIP_INVERT, FLIP_LEFT, FLIP_RIGHT];
			if (mode != DESTRUCT && !forceAllMove)
				directions.push(NO_FLIP);

			var direction = (mode == RECORD || mode == DESTRUCT? directions[Math.floor(Math.random() * directions.length)] : queueLayer[index]);
			var transform = (direction != NO_FLIP ? getFlipTarget(triangle, direction) : null);

			if (mode == RECORD)
				queueLayer[index] = getOppositeDirection(direction);
			if (direction == NO_FLIP)
				continue;

			var currentPosition = core.clone(triangle.pos);
			updatePosition(triangle, direction);

			triangle.target = transform.to;
			triangle.points = transform.from;
			triangle.path = transform.path;
			if (mode == RECORD) //don't animate, just set the properties directly
			{
				for (var i = 0; i < triangle.points.length; i++)
				{
					for (var prop in triangle.target[i])
					{
						triangle.points[i][prop] = triangle.target[i][prop];
						triangle.shadow[i][prop] = triangle.target[i][prop];
					}
				}
			}
			else//if (mode == PLAYBACK || mode == DESTRUCT)
			{
				var triangleHideMode = hideMode;
				//take into account next triangles, and only hide if not in starting position for next shape
				var checkVsNext = (hideMode == HIDE_AFTER && nextTriangles != null);
				var foundTriangleInEndPosition = false;
				if (checkVsNext) //pos has already updated to end position (above)
					foundTriangleInEndPosition = (findTriangleAt(nextTriangles, triangle.pos) != null);
				if (foundTriangleInEndPosition)
				{
					mergedTriangles.push(triangle);
					triangleHideMode = NO_HIDE;
				}

				//check if triangles coming into the screen on first show are actually already on screen from last shape
				var isMerging = false;
				if (triangleHideMode == HIDE_BEFORE)
				{
					var mergedTriangle = findTriangleAt(mergedTriangles, currentPosition);
					isMerging = (mergedTriangle != null);
					if (isMerging)
					{
						triangleHideMode = NO_HIDE;
						triangle.previousColor = core.decomposeColor(mergedTriangle.color);
						triangle.nextColor = core.decomposeColor(triangle.color);
						triangle.color = mergedTriangle.color;
					}
					else
					{
						triangle.colorTarget = shapeLib.backgroundColor;
					}
				}
				else
				{
					delete triangle.previousColor;
					delete triangle.nextColor;
				}
				delete triangle.colorTarget;
				if (triangleHideMode == HIDE_BEFORE && !isMerging)
				{
					triangle.colorTarget = shapeLib.backgroundColor;
				}
				//don't overlay a hidden triangle over a viewable triangle
//				if (triangleHideMode == HIDE_AFTER)
//				{
//					var overTriangle = findTriangleAt(triangles, triangle.pos, triangle);
//					if (overTriangle != null)
//					{
//						triangle.previousColor = triangle.color;
//						triangle.nextColor = overTriangle.color;
//						triangleHideMode = NO_HIDE;
//					}
//				}

				var tweenProperties = {proxy: 1}; //tween from 0 to this
				tweenProperties.delay = index / triangles.length * waveTime;//Math.random() * waveTime + wait / 1000;// mathUtils.getDistance(col, row, triangles[0].length / 2, triangles.length / 2) * waveTime//col * 0.4 + row * 0.1;//Math.random() * 4;
				tweenProperties.onUpdate = function(tween, triangle, hideMode, direction)
					{
						updateTriangle(tween, triangle, hideMode, direction);
					}
				tweenProperties.onUpdateParams = ["{self}", triangle, triangleHideMode, direction];
				TweenMax.to({proxy: 0}, flipTime, tweenProperties);
				totalFlipTime = Math.max(totalFlipTime, tweenProperties.delay);
			}
		}

		if (mode == PLAYBACK || mode == DESTRUCT)
		{
			setTimeout(function(){
				var updateTriangles = setInterval(function()
				{
					drawTriangles(triangles);
				}, timesteps);

				setTimeout(function()
				{
					clearInterval(updateTriangles);
					if (onComplete != undefined)
						onComplete();
				}, (totalFlipTime + flipTime) * 1000);
			}, wait);

		}
	}

	function findTriangleAt(triangles, position, ignore)
	{
		for (var i = 0; i < triangles.length; i++)
		{
			var triangle = triangles[i];
			if (ignore != undefined && triangle == ignore)
				continue;
			if (triangle.pos.row == position.row && triangle.pos.col == position.col)
				return triangle;
		}
		return null;
	}

	/**
	 * This is not very intuitive at all. Due to the layout system, there is a very particular set of cases for when triangles change rows and columns
	 * given a direction. The easiest way to view this is to run the drawing tool and draw triangles directly next to each other.
	 * Make sure to have at least 4 rows and 4 columns and test each row/column permutation.
	 *
	 * Easiest thing to do (to understand) is to check out the createTriangleAt function
	 *
	 * Display (2 rows):
	 * ____________
	 * \ /\ /\ /\ / (downfacing)
	 *  v__v__v__v_ (upfacing)
	 *
	 * Layout (4 rows):
	 * - - - - (down)
	 *  - - - - (up)
	 * - - - - (down)
	 *  - - - - (up)
	 *
	 * movement example:
	 *
	 * \a/\ /\ /
	 *  v bv  v
	 *
	 *  Triangle a moves to b. This is one move to the right, and one column down visually, but actually (if this is the top left corner)
	 *  it will be only a shift down a row. If in another area of the grid, it would possibly also include the column shift.
	 *
	 * @param triangle
	 * @param direction
	 */
	function updatePosition(triangle, direction)
	{
		var colAdjust = 0;
		var rowAdjust = 0;
		var offset;
		switch (direction)
		{
			case FLIP_INVERT:
				if (triangle.isUpFacing)
					rowAdjust = 1;
				else
					rowAdjust = -1;
				break;

			case FLIP_LEFT:
				if (triangle.isUpFacing)
					rowAdjust = -1;
				else
					rowAdjust = 1;
					offset = [1, 0, 0, 1];
					colAdjust = -offset[triangle.pos.row % 4];
				break;

			case FLIP_RIGHT:
				if (triangle.isUpFacing)
					rowAdjust = -1;
				else
					rowAdjust = 1;
					offset = [0, 1, 1, 0];
					colAdjust = offset[triangle.pos.row % 4];;
				break;
		}
		//will always swap
		triangle.isUpFacing = !triangle.isUpFacing;
		triangle.pos.row += rowAdjust;
		triangle.pos.col += colAdjust;
	}

	function updateTriangle(tween, triangle, hideMode, direction)
	{
		var showShadow = true;

		//adjust this per animation type - inversion takes longer to actually flip over
		var halfwayMark = 0.5;
		var progress = tween.progress();
		if (direction == FLIP_INVERT)
		{
			halfwayMark = 0.82;
			if (triangle.isUpFacing)
				halfwayMark = 1 - halfwayMark;
		}
		if (hideMode == HIDE_AFTER && progress > halfwayMark)
		{
			triangle.colorTarget = shapeLib.backgroundColor;
			if (progress == 1)
				showShadow = false;
		}
		else if (hideMode == HIDE_BEFORE && progress < halfwayMark)
		{
			triangle.colorTarget = shapeLib.backgroundColor;
			showShadow = false;
		}
		else if (triangle.colorTarget != undefined)
		{
			delete triangle.colorTarget;
		}
		triangle.showShadow = showShadow;

		if (triangle.previousColor != undefined)
		{
			var rDiff = triangle.nextColor.r - triangle.previousColor.r;
			var gDiff = triangle.nextColor.g - triangle.previousColor.g;
			var bDiff = triangle.nextColor.b - triangle.previousColor.b;
			var colorProgress = (progress - halfwayMark) / (1 - halfwayMark);
			if (colorProgress < 0)
				colorProgress = 0;
			triangle.color = core.recomposeColor(
				{
					r: triangle.previousColor.r + Math.ceil(rDiff * colorProgress),
					g: triangle.previousColor.g + Math.ceil(gDiff * colorProgress),
					b: triangle.previousColor.b + Math.ceil(bDiff * colorProgress)
				});
		}

		var percent = tween.progress();
		for (var i = 0; i < triangle.points.length; i++)
		{
			var frame = Math.floor(percent * (triangle.path.points[i].length - 1));
			triangle.shadow[i].x = triangle.path.shadow[i][frame].x;
			triangle.shadow[i].y = triangle.path.shadow[i][frame].y;
			triangle.points[i].x = triangle.path.points[i][frame].x;
			triangle.points[i].y = triangle.path.points[i][frame].y;
		}
	}

	function getOppositeDirection(direction)
	{
		switch (direction)
		{
			case FLIP_LEFT:
				direction = FLIP_RIGHT;
				break;
			case FLIP_RIGHT:
				direction = FLIP_LEFT;
				break;
			//invert stays as is since it counts as either direction
		}
		return direction;
	}

	function getTriangles(id)
	{
		var shape = shapeLib.parseShape(id);
		var optimised = [];
		for (var row = 0; row < shape.length; row++)
		{
			for (var col = 0; col < shape[row].length; col++)
			{
				if (shape[row][col] > 0)
				{
					var colorId = shape[row][col] - 1; //for array access
					var colorList = shapeLib.getColorList(colorId);
					var triangle = createTriangleAt(col, row);
					var shadow = [];
					for (var i = 0; i < triangle.points.length; i++)
						shadow.push({x: triangle.points[i].x, y: triangle.points[i].y});
					optimised.push(
						{
							points: triangle.points,
							color: colorList[Math.floor(Math.random() * colorList.length)],
							isUpFacing: triangle.isUpFacing,
							shadow: shadow,
							pos: triangle.pos
						});
				}
			}
		}
		return optimised;
	}

	function drawTriangles(triangles, noClear)
	{
		if (noClear == undefined || noClear == false)
			clear();
		for (var index = 0; index < triangles.length; index++)
		{
			if (triangles[index].showShadow != undefined && triangles[index].showShadow)
			{
				var shadow = triangles[index].shadow;
				drawPoly(shadow, shapeLib.shadowColor);
			}
		}

		var box = getTriangleBox();

		shadowBlur.type.blur(2, box.topLeft.x, box.topLeft.y, box.bottomRight.x, box.bottomRight.y);

		//drawPoly([{x: box.topLeft.x, y:box.topLeft.y}, {x:box.bottomRight.x, y:box.topLeft.y}, {x:box.bottomRight.x, y:box.bottomRight.y}, {x:box.topLeft.x, y:box.bottomRight.y}], "#FFF")

		for (var index = 0; index < triangles.length; index++)
		{
			var triangle = triangles[index];
			var color = triangle.color;
			if (triangle.colorTarget != undefined)
				color = triangle.colorTarget;
			drawPoly(triangle.points, color);
		}
	}

	/**
	 * returns the top left-most point and bottom-right most point for all the triangles' shadows
	 */
	function getTriangleBox()
	{
		//start them on the wrong sides to get the min/max
		var tl = {x: canvas.width, y: canvas.height};
		var br = {x: 0, y: 0};

		for (var i = 0; i < triangles.length; i++)
		{
			var triangle = triangles[i];
			for (var k = 0; k < triangle.shadow.length; k++)
			{
				var point = triangle.shadow[k];
				if (point.x < tl.x)
					tl.x = point.x;
				if (point.y < tl.y)
					tl.y = point.y;
				if (point.x > br.x)
					br.x = point.x;
				if (point.y > br.y)
					br.y = point.y;
			}
		}
		//constrain to canvas
		if (tl.x < 0)
			tl.x = 0;
		if (tl.y < 0)
			tl.y = 0;
		if (br.x > canvas.width)
			br.x = canvas.width;
		if (br.y > canvas.height)
			br.y = canvas.height;
		return {topLeft: tl, bottomRight: br};
	}

	//neaten this up for optimisation
	function createTriangleAt(col, row)
	{
		var isUpFacing = (row % 2 == 1);
		var points = [];
		var horizontalSpacing = horizontalPadding + size;
		var verticalSpacing = height + verticalPadding;

		var horizontalOffsets = [0, 1, 1, 0];
		var horizontalOffset = horizontalOffsets[(row % 4)] * 0.5 * horizontalSpacing + col * horizontalSpacing;
		var verticalOffset = (row - Math.ceil(row / 2)) * verticalSpacing;

		//define the shape type
		if (isUpFacing)
		{
			points = [
				{x: 0.5, y: 0}, 	//t
				{x: 1, y: 1},		//r
				{x: 0, y: 1}		//l
			];
		}
		else
		{
			points = [
				{x: 0, y: 0},		//l
				{x: 1, y: 0},		//r
				{x: 0.5, y: 1}	    //b
			];
		}

		//size the triangle

		for (var i = 0; i < points.length; i++)
		{
			points[i].x = points[i].x * size + horizontalOffset;
			points[i].y = points[i].y * height + verticalOffset;
		}

		return {pos: {row: row, col: col}, points: points, isUpFacing: isUpFacing};
	}


	/**
	 *
	 * @param triangle
	 * @param direction
	 * @return
	 * {
	 * from:
	 *    [{x, y}, //activePoint
	 *     {x,y}, {x,y}],
	 * to:
	 *    [{x, y}, //activePoint
	 *     {x,y}, {x,y}]}
	 * paths:
	 *      [
	 *          [{x, y}, ...], //path of motion for activePoint from-to in above array
	 *          [{x, y}, ...], //path of motion for from-to in above array
	 *          [{x, y}, ...] //path of motion for from-to in above array
	 *      ]
	 */
	function getFlipTarget(triangle, direction)
	{
		var points = triangle.points;

		var control; //apex - top or bottom
		var left;
		var right;

		//get top, left, right points
		//super lame way to determine which direction it faces, whole method is clunky
		control = points[0];
		var threshold = 1;
		if (core.roughlyEqual(control.y, points[1].y, threshold))
			control = points[2];
		else if (core.roughlyEqual(control.y, points[2].y, threshold))
			control = points[1];
		var notControl = [points[0], points[1], points[2]]
		notControl.splice(notControl.indexOf(control), 1);
		var isUpFacing = control.y < notControl[0].y;

		if (notControl[0].x < notControl[1].x)
		{
			left = notControl[0];
			right = notControl[1];
		}
		else
		{
			left = notControl[1];
			right = notControl[0];
		}
		var activePoint;
		var pointTarget = {x: 0, y: 0};
		var from = [];
		var to = [];

		var padding = 0;

		switch (direction)
		{
			case FLIP_INVERT:
				padding = (isUpFacing? verticalPadding: -verticalPadding);
				activePoint = control;
				pointTarget.x = control.x;
				pointTarget.y = (isUpFacing? activePoint.y + height * 2 : activePoint.y - height * 2) + padding;
				from = [activePoint, left, right];
				to = [pointTarget, {y: left.y + padding}, {y: right.y + padding}];
				break;

			case FLIP_LEFT:
				padding = -horizontalPadding / 2;
				activePoint = right;
				pointTarget.x = activePoint.x - size * 1.5 + padding;
				pointTarget.y = control.y;
				from = [activePoint, control, left];
				to = [pointTarget, {x: control.x + padding}, {x: left.x + padding}];
				break;

			case FLIP_RIGHT:
				padding = horizontalPadding / 2;
				activePoint = left;
				pointTarget.y = control.y;
				pointTarget.x = activePoint.x + size * 1.5 + padding;
				from = [activePoint, control, right];
				to = [pointTarget, {x: control.x + padding}, {x: right.x + padding}];
				break;
		}
		var paths = [];
		var shadow = [];
		for (var i = 0; i < from.length; i++)
		{
			var curve = (i == 0 ? direction : undefined);
			var path = getMotionPath(from[i], to[i], curve, isUpFacing);
			paths.push(path.path);
			shadow.push(path.shadow);
		}

		//anim flip
		//var path = getMotionPath(pointTarget, activePoint);
		//debugPath(path);
		return {from: from, to: to, path: {points: paths, shadow: shadow}};
	}

	/**
	 *
	 * calculate a curve path (for activePoint on left, right flips only) so that the triangle seems to flip in 3D
	 */
	function getMotionPath(from, to, direction, isUpFacing)
	{
		var path = [];
		if (to.x == undefined)
			to.x = from.x;
		if (to.y == undefined)
			to.y = from.y;
		var angle = mathUtils.getAngle(to.x, to.y, from.x, from.y);
		var distance = mathUtils.getDistance(to.x, to.y, from.x, from.y);
		var numFrames = Math.ceil(1000 / timesteps * flipTime); //only calculate for the number of frames that'll be used in the tween itself
		var interval = distance / numFrames;

		//calculate arc from-to for activePoint. Define a center for the circle along the normal to the from-to path and then draw the arc
		var arcLength;
		var arcRadius;
		var startAngle;
		var endAngle;
		var normal = {};

		var shadowNormal = {};
		var shadowArcRadius;
		var shadowStartAngle;
		var shadowEndAngle;
		var shadowArcLength;

		if (direction != undefined && direction != FLIP_INVERT)
		{
			//normal = mathUtils.getCenter(to.x, to.y, from.x, from.y);
			var center = mathUtils.getCenter(to.x, to.y, from.x, from.y);
			var normalAngle = angle - Math.PI / 2; //actually the path of the triangle line between the flip point and current point (ie. the bisector)
			if (direction == FLIP_LEFT)
				normalAngle = angle + Math.PI / 2;
			var normalRadius = size * 1.5;
			normal.x = center.x + Math.sin(normalAngle) * normalRadius;
			normal.y = center.y + Math.cos(normalAngle) * normalRadius;
			startAngle = mathUtils.getAngle(normal.x, normal.y, from.x, from.y);
			endAngle = mathUtils.getAngle(normal.x, normal.y, to.x, to.y);
			startAngle += Math.PI;
			endAngle += Math.PI;
			arcRadius = mathUtils.getDistance(normal.x, normal.y, from.x, from.y); //use either from or to for the radius
			arcLength = endAngle - startAngle;

			var shadowAngle = normalAngle + Math.PI;
			var shadowRadius = size;
			shadowNormal.x = center.x + Math.sin(shadowAngle) * shadowRadius;
			shadowNormal.y = center.y + Math.cos(shadowAngle) * shadowRadius;
			shadowArcRadius = mathUtils.getDistance(shadowNormal.x, shadowNormal.y, from.x, from.y);
			shadowStartAngle = mathUtils.getAngle(from.x, from.y, shadowNormal.x, shadowNormal.y);
			shadowEndAngle = mathUtils.getAngle(to.x, to.y, shadowNormal.x, shadowNormal.y);
			shadowArcLength = shadowEndAngle - shadowStartAngle;
		}

		var ease = core.ease();//.backOut;
		if (direction == FLIP_INVERT)
		{
			if (isUpFacing)
				ease = ease.backIn;
			else
				ease = ease.backOut;
		}
		var deltaX = to.x - from.x;
		var deltaY = to.y - from.y;
		var shadow = [];
		for (var i = 0; i < numFrames; i++)
		{
			var radius = i * interval;
			var point;
			var shadowPoint;
			var progress = i / (numFrames - 1);
			var x = from.x + Math.sin(angle) * radius;
			var y = from.y + Math.cos(angle) * radius;
			if (direction == undefined)
			{
				point = {x: x, y: y};
				shadowPoint = {x: x, y: y};
			}
			else if (direction == FLIP_INVERT)
			{
				shadowPoint = {x: x, y: y};
				x = ease(progress, from.x, deltaX);
				y = ease(progress, from.y, deltaY);
				point = {x: x, y: y};
			}
			else //calc arc
			{
				var arcAngle = arcLength * progress + startAngle;
				var shadowArcAngle = shadowArcLength * progress + shadowStartAngle;
				point =
					{
						x: normal.x + Math.sin(arcAngle) * arcRadius,
						y: normal.y + Math.cos(arcAngle) * arcRadius
					};
				shadowPoint =
					{
						x: shadowNormal.x + Math.sin(shadowArcAngle) * shadowArcRadius,
						y: shadowNormal.y + Math.cos(shadowArcAngle) * shadowArcRadius
					};
			}
			path.push(point);
			shadow.push(shadowPoint);
		}
		//safety measure to make sure the final target is hit
		path.push(to);
		shadow.push(to);
		return {path: path, shadow: shadow};
	}

	function drawPoly(points, fill)
	{
		// Set the style properties.
		context.fillStyle   = fill;

		context.beginPath();
		for (var i = 0; i < points.length; i++)
		{
			var method = "lineTo";
			if (i == 0)
				method = "moveTo";
			context[method](points[i].x, points[i].y);
		}
		context.lineTo(points[0].x, points[0].y); // give the (x,y) coordinates
		context.fill();
		context.closePath();
	}

	return {
			init: init,
			pause: pause,
			play: play,
			showShapeId: showShapeId,
			destructToShapeId: destructToShapeId,
			setShapeReconstructedCallback: setShapeReconstructedCallback
		};
});