define(
	[
		'jquery',
		'base/core',
		'animation/ease',
		'triangles/shapes'
	],
	function ($, core, ease, shapeLib)
	{
		var slideShowTime = 5500;
		var titles;
		var title;
		var titleHolder;
		var slug;
		var icon;
		var index;
		var current;
		var triangles;
		var elementTime = 1000;
		var showShape;
		var isShapeReady = false;
		var isTitlesReady = false;

		var init = function(header, titleTarget, slugTarget, iconTarget, triangleHolder)
		{
			triangles = triangleHolder;
			triangles.setShapeReconstructedCallback(setShapeReady);
			setupTitles();

			title = $(titleTarget, header);
			titleHolder = title.parent();
			slug = $(slugTarget, header);
			icon = $(iconTarget, header);
			icon.css("display", "inline");
			index = 0;
			current = titles[index];

			titleHolder.css({height: 0});
			slug.css({opacity: 0, height: 0});
			icon.css({opacity: 0, marginLeft: -100});
			slug.css({overflow: "hidden"});
			showShape = triangles.showShapeId;
			show();
		}

		function setupTitles()
		{
			console.log(triangles);
			titles = [
				{
					title: "AFRICA’S FULL-SERVICE INTERACTIVE, DIGITAL ADVERTISING AGENCY",
					slug: "NATIVE is a digital-led integrated marketing agency with a strong reputation for strategic thinking and excellent creative work.",
					shape: shapeLib.shapeIds.africa
				},
				{
					title: "WE LINKED A TAP TO THE INTERNET",
					slug: "To raise awareness for water saving NATIVE and Flow ran a social media campaign and 10 000 users spread the word over Twitter and Facebook and with it closed a running tap.",
					link: "www.google.co.za",
					shape: shapeLib.shapeIds.tap
				},
				{
					title: "WE ARE PROUD TO JOIN THE CHIVAS BROTHERHOOD",
					slug: "Chivas Regal is NATIVE’s latest addition to our consumer brands portfolio.",
					link: "www.google.co.za",
					shape: shapeLib.shapeIds.logo
				}
			];
		}

		function show()
		{
			var slugline = current.slug;
			if (current.link != undefined)
				slugline += " <a href='" + current.link + "'>Read more...</a>";
			title.html(current.title);
			slug.html(slugline);
			icon.delay(500).animate({opacity: 1, marginLeft: 0}, {duration: elementTime, easing: "swing"});
			titleHolder.delay(1500).animate({height: title.height()}, {duration: elementTime, easing: "swing"});
			slug.delay(2000).animate({opacity: 1, marginTop: 0, height: 100}, {duration: elementTime, easing: "swing"});

			showShape(current.shape);
			setTimeout(function()
				{
					isTitlesReady = true;
					next();
				}, slideShowTime);
		}

		function next()
		{
			if (isTitlesReady && isShapeReady)
			{
				isShapeReady = false;
				isTitlesReady = false;

				var hideTime = 500;
				showShape = triangles.destructToShapeId;
				titleHolder.stop().delay(hideTime).animate({height: 0}, {duration: elementTime, easing: "swing"});
				slug.stop().animate({height: 0}, {duration: elementTime, easing: "swing"});
				if (++index > titles.length - 1)
					index = 0;
				current = titles[index];
				hideTime += elementTime;
				setTimeout(show, hideTime);
			}
		}

		function setShapeReady()
		{
			isShapeReady = true;
			next();
		}

		return {init: init};
	});
