define(
	[
	],
	function ()
	{

		var TAU = Math.PI * 2;

		function getDistance(x1, y1, x2, y2)
		{
			return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
		}

		/**
		 *
		 * @return radians:Number
		 */
		function getAngle(x1, y1, x2, y2)
		{
			return Math.atan2(x1 - x2, y1 - y2);
		}

		function toDegrees(radians)
		{
			return 180 / Math.PI * radians;
		}

		function toRadians(degrees)
		{
			return Math.PI / 180 * degrees;
		}

		/**
		 *
		 * @return {x:Number, y:Number}
		 */
		function getCenter(x1, y1, x2, y2)
		{
			return {x: (x1 + x2) / 2, y: (y1 + y2) / 2};
		}

		return {TAU: TAU, getDistance: getDistance, getAngle: getAngle, toDegrees: toDegrees, toRadians: toRadians, getCenter: getCenter};
	});