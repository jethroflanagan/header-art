define(
    [
    ],
    function () {
        function log(var_args)
        {
	        //history = history || [];   // store logs to an array for reference
	        //history.push(arguments);
	        //fix an absolutely pathetic webkit bug (https://bugs.webkit.org/show_bug.cgi?id=35801) as yet unconfirmed (according to them)
	        //for 2 fucking years. IE 7 isn't that stupid.
	        for (var i = 0; i < arguments.length; i++)
	        {
		        if (typeof arguments[i] == "object")
	                arguments[i] = clone(arguments[i]);
	        }
	       console.log( Array.prototype.slice.call(arguments) );
        }

	    /**
	     * string to rgb
	     * @param value
	     */
	    function decomposeColor(value)
	    {
			var hex = parseInt(value.substr(1), 16);
		    var r = hex >> 16;
		    var g = hex >> 8 & 0xFF;
		    var b = hex & 0xFF;
		    return {r: r, g: g, b: b};
	    }

	    function recomposeColor(rgb)
	    {
		    var r = pad(Math.round(rgb.r).toString(16), 2);
		    var g = pad(Math.round(rgb.g).toString(16), 2);
		    var b = pad(Math.round(rgb.b).toString(16), 2);

		    var hex = "#" + r + g + b;
		    return hex;
	    }

	    function pad(val, amount)
	    {
		    var padding = "";
		    amount -= val.length;
		    for (var i = 0; i < amount; i++)
		        padding += "0";
		    return padding + val;
	    }

	    function clone(object)
	    {
		    try{
		        return JSON.parse(JSON.stringify(object));
		    }
		    catch(e)
		    {
		    }
		    return object;
	    }


	    function roughlyEqual(a, b, threshold)
	    {
		    return Math.abs(a - b) < threshold;
	    }

	    /*
	    Taken from http://www.createjs.com/Docs/TweenJS/Ease.js.html, which are based on Robert Penner's functions
	     */
	    function ease()
	    {
		    /*function backOut(currentProgress, totalProgress, startValue, endValue, energy)
		    {
			    if (energy == undefined)
			        energy = 1.70158;
			    return endValue * ((currentProgress = currentProgress / totalProgress - 1) * currentProgress * ((energy + 1) * currentProgress + energy) + 1) + startValue;
			}*/

		    function backOut(progress, start, end)
		    {
			    var energy = 0.5//1.70158;
			    return end * (--progress*progress*((energy+1)*progress + energy) + 1) + start;

		    }

		    function backIn(progress, start, end)
		    {
			    var energy = 0.5//1.70158;
			    return end * (progress * progress * ((energy + 1) * progress - energy)) + start;
		    }

		    return {backIn: backIn, backOut: backOut};
	    }
        return {log: log, ease: ease, clone: clone, decomposeColor: decomposeColor, recomposeColor: recomposeColor, roughlyEqual: roughlyEqual};
    });