define(
	[
		'jquery',
		'base/core'
	],
	function ($, core) {
		var emptyColor = "#363636";
		var darkColor = "#555";
		var orangeColor = "#6e3b32";
		var blueColor = "#459e99";
		var size = 18;
		var height = size * Math.sqrt(3)/2;
		var horizontalPadding = 2;
		var verticalPadding = 1;
		var backgroundColor = "#262626";
		var numCols = 24;
		var numRows = 50;

		var canvas;
		var context;
		var helper;

		var triangles = [];
		var colors = [emptyColor, darkColor, orangeColor, blueColor];
		var currentColor = 1;
		var overTriangle;
		var isDown = false;
		//var drawColor = background;
		var previousShape;
		var initialShape;
		var init = function(target)
		{

			window.canvas = document.getElementById(target);
			window.context = window.canvas.getContext("2d");
			canvas = window.canvas;
			context = window.context;
			context.fill(backgroundColor);

			helper = document.getElementById("helper");
			helper.style.visibility = "visible";
			updateButton = $("#update");
			var shape = "";
			for (var i = 0; i < numRows; i++)
				shape += createShapeLine();

			initialShape = shape.slice(0);
			previousShape = shape.slice(0);
			createShapeFromText(shape);

			updateButton.click(function(e){createShapeFromText()});
			window.addEventListener("mousemove", mouseMove, false);
			window.addEventListener("mousedown", mouseDown, false);
			window.addEventListener("mouseup", mouseUp, false);
			window.addEventListener("keydown", keyDown, false);
			window.onkeypress = keyDown;
		}

		function createShapeLine()
		{
			var chars = "";
			for (var i = 0; i < numCols; i++)
				chars += "0";
			return chars + "\n";
		}

		function keyDown(e)
		{
			var char = String.fromCharCode(e.charCode);
			var key = e.keyCode;
			core.log("key", key);
			switch (char)
			{
				case "=":
				case "+":
					currentColor++;
					if (currentColor > colors.length - 1)
						currentColor = 0;
					break;
				case "-":
					currentColor--;
					if (currentColor < 0)
						currentColor = colors.length - 1;
					break;
				case "c":
					//shape = initialShape;
					createShapeFromText(initialShape);
					break;

			}
			switch (key)
			{
				case 38: //up
					shiftPic(0, -1);
					break;
				case 40: //down
					shiftPic(0, 1);
					break;
				case 37: //left
					shiftPic(-1, 0);
					break;
				case 39: //right
					shiftPic(1, 0);
					break;

			}
			drawSwatch();
		}

		function shiftPic(x, y)
		{
			var line = createAsciiLine();
			for (var row = 0; row < y; row++)
			{

			}
		}

		function mouseUp(e)
		{

			isDown = false;
		}

		function createShapeFromText(text)
		{
			triangles = "";
			if (text == undefined)
			{
				text = helper.value;
				text = text.replace(/\t/g, '');
				text = text.replace(/"/g, '');
				text = text.replace(/\+/g, '');
				text = text.replace(/ /g, '');
				text = text.replace(/\\n/g, '');
				core.log(text);
			}
			triangles = getTriangles(parseShape(text));
			drawTriangles();
		}

		function drawSwatch()
		{
			var size = 40;
			var x = canvas.width - size;
			var y = canvas.height - size;
			drawPoly([{x: x, y: y}, {x: x + size, y: y}, {x: x + size, y: y + size}, {x: x, y: y + size}], colors[currentColor]);
		}

		function clear()
		{
			context.fillStyle = backgroundColor;
			context.fillRect(0, 0, canvas.width, canvas.height, backgroundColor);
		}

		function mouseDown(e)
		{
			isDown = true;
			mouseMove(e);
		}

		function mouseMove(e)
		{
			core.log((e.x - canvas.offsetLeft));
			var hasChanged = false;
			for (var row = 0; row < triangles.length; row++)
			{
				for (var col = 0; col < triangles[row].length; col++)
				{
					if (triangles[row][col] != null)
					{
						var triangle = triangles[row][col];
						var inTriangle = pointInTriangle({x: e.x, y: e.y}, triangle.points[0], triangle.points[1], triangle.points[2]);
						if (inTriangle)
						{
							if (overTriangle != triangle || overTriangle.color != currentColor)
							{
								overTriangle = triangle;
								if (isDown)
								{
									triangle.color = currentColor;
									hasChanged = true;
								}
							}
						}
					}
				}
			}
			if (hasChanged)
				drawTriangles();

		}

		// Returns true if point P inside the triangle with vertices at A, B and C
		// representing 2D vectors and points as [x,y]. Based on
		// http://www.blackpawn.com/texts/pointinpoly/default.html
		function pointInTriangle(P, A, B, C) {
			// Compute vectors
			function vec(from, to) {  return {x: to.x - from.x, y: to.y - from.y};  }
			var v0 = vec(A, C);
			var v1 = vec(A, B);
			var v2 = vec(A, P);
			// Compute dot products
			function dot(u, v) {  return u.x * v.x + u.y * v.y;  }
			var dot00 = dot(v0, v0);
			var dot01 = dot(v0, v1);
			var dot02 = dot(v0, v2);
			var dot11 = dot(v1, v1);
			var dot12 = dot(v1, v2);
			// Compute barycentric coordinates
			var invDenom = 1.0 / (dot00 * dot11 - dot01 * dot01);
			var u = (dot11 * dot02 - dot01 * dot12) * invDenom;
			var v = (dot00 * dot12 - dot01 * dot02) * invDenom;
			// Check if point is in triangle
			return (u >= 0) && (v >= 0) && (u + v < 1);
		}

		function getTriangles(shape)
		{

			for (var row = 0; row < shape.length; row++)
			{
				for (var col = 0; col < shape[row].length; col++)
				{
					var colorId = shape[row][col]; //for array access
					shape[row][col] = {points: createTriangleAt(col, row), color: colorId, pos: {col: col, row: row}};
				}
			}
			return shape;
		}

		function drawTriangles()
		{
			clear();
			//helper.val("");
			var info = "";
			for (var row = 0; row < triangles.length; row++)
			{
				info += "\"";
				for (var col = 0; col < triangles[row].length; col++)
				{
					var triangle = triangles[row][col];
					var color = colors[triangle.color];
					info += triangle.color;
					drawPoly(triangle.points, color);
				}
				info += "\\n\"" +
						(row < triangles.length - 1 ? " + " : "") +
						"\n";
			}
			helper.value = info;
			drawSwatch();
		}

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
					{x: 0.5, y: 1}	//b
				];
			}

			//size the triangle

			for (var i = 0; i < points.length; i++)
			{
				points[i].x = points[i].x * size + horizontalOffset;
				points[i].y = points[i].y * height + verticalOffset;
			}

			return points;
			//flipOver(points, FLIP_LEFT);

			//drawPoly(points, "#f00");
		}
		function parseShape(shapeString)
		{
			var def = shapeString;
			if (typeof def == "string")
			{
				def = def.trim().split("\n");
				for (var row = 0; row < def.length; row++)
				{
					def[row]  = def[row].split("");
				}

			}
			return def;
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
		return {init: init};
	});