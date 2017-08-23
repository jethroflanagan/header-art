define(
	[
	],
	function()
	{
		function init(canvas, context)
		{
			function createImageData(w, h)
			{
				return context.createImageData(w, h);
			}

			function getImageData(x, y, w, h)
			{
				return context.getImageData(x, y, w, h);
			}

			function getAllImageData()
			{
				//context.drawImage(img);
				return getImageData(0, 0, canvas.width, canvas.height);
			}

			function filterImage(filter, image, var_args) {
				var args = [getAllImageData(image)];
				for (var i = 2; i < arguments.length; i++) {
					args.push(arguments[i]);
				}
				return filter.apply(null, args);
			}

			function runPasses(numPasses, var_args)
			{
				var args = [];
				for (var i = 1; i < arguments.length; i++) {
					args.push(arguments[i]);
				}
				var output = null;
				for (var pass = 0; pass < numPasses; pass++)
				{
					output = filterImage.apply(null, args);
				}
				return output;
			}

			function convolute(pixels, weights, opaque)
			{
				var side = Math.round(Math.sqrt(weights.length));
				var halfSide = Math.floor(side / 2);
				var src = pixels.data;
				var sw = pixels.width;
				var sh = pixels.height;
				// pad output by the convolution matrix
				var w = sw;
				var h = sh;
				var output = createImageData(w, h);
				var dst = output.data;
				// go through the destination image pixels
				var alphaFac = opaque ? 1 : 0;
				for (var y=0; y<h; y++)
				{
					for (var x=0; x<w; x++)
					{
						var sy = y;
						var sx = x;
						var dstOff = (y*w+x)*4;
						// calculate the weighed sum of the source image pixels that
						// fall under the convolution matrix
						var r=0, g=0, b=0, a=0;
						for (var cy=0; cy<side; cy++)
						{
							for (var cx=0; cx<side; cx++)
							{
								var scy = sy + cy - halfSide;
								var scx = sx + cx - halfSide;
								if (scy >= 0 && scy < sh && scx >= 0 && scx < sw)
								{
									var srcOff = (scy*sw+scx)*4;
									var wt = weights[cy*side+cx];
									r += src[srcOff] * wt;
									g += src[srcOff+1] * wt;
									b += src[srcOff+2] * wt;
									a += src[srcOff+3] * wt;
								}
							}
						}
						dst[dstOff] = r;
						dst[dstOff+1] = g;
						dst[dstOff+2] = b;
						dst[dstOff+3] = a + alphaFac*(255-a);
					}
				}
				return output;
			}

			function type()
			{
				function blur(passes, x, y, w, h)
				{
					if (x == undefined)
						x = 0;
					if (y == undefined)
						y = 0;
					if (w == undefined)
						w = canvas.width;
					if (h == undefined)
						h = canvas.height;
					var amount = 1 / 9;
					var image = getImageData(x, y, w, h);
					var filtered = filterImage(convolute, image,
						[
							amount, amount, amount,
							amount, amount, amount,
							amount, amount, amount
						]);

					context.putImageData(filtered, 0, 0);
				}

				return {blur: blur};
			}

			return {type: type(), getImageData: getImageData};
		}
		return init;
	}
);