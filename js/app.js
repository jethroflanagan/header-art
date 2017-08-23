define(
    [
        'base/core',
        'triangles/triangles',
        'titles/titles',
	    'triangles/create_shape'
    ],
    function (core, triangles, titles, create) {
        var init = function(){
	        triangles.init("triangles");
	        titles.init("#header", "h1", "p:last", ".banner-sprite", triangles);

	        //run the drawing tool
	        //create.init("triangles");
        }
        return {init: init};
    });