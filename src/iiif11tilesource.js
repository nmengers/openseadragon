/*
 * OpenSeadragon - IIIF11TileSource
 *
 * Copyright (C) 2009 CodePlex Foundation
 * Copyright (C) 2010-2013 OpenSeadragon contributors
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * - Redistributions of source code must retain the above copyright notice,
 *   this list of conditions and the following disclaimer.
 *
 * - Redistributions in binary form must reproduce the above copyright
 *   notice, this list of conditions and the following disclaimer in the
 *   documentation and/or other materials provided with the distribution.
 *
 * - Neither the name of CodePlex Foundation nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/*
 * The getTileUrl implementation is based on Jon Stroop's Python version,
 * which is released under the New BSD license:
 * https://gist.github.com/jpstroop/4624253
 */


(function( $ ){

/**
 * A client implementation of the International Image Interoperability
 * Format: Image API Draft 0.2 - Please read more about the specification
 * at
 *
 * @class
 * @extends OpenSeadragon.TileSource
 * @see http://library.stanford.edu/iiif/image-api/
 */
$.IIIF11TileSource = function( options ){

    $.extend( true, this, options );

    if( !(this.height && this.width && this['@id'] ) ){
        throw new Error('IIIF required parameters not provided.');
    }

    //TODO: at this point the base tile source implementation assumes
    //      a tile is a square and so only has one property tileSize
    //      to store it.  It may be possible to make tileSize a vector
    //      OpenSeadraon.Point but would require careful implementation
    //      to preserve backward compatibility.
    options.tileSize = this.tile_width;

    if (! options.maxLevel ) {
        var mf = -1;
        var scfs = this.scale_factors || this.scale_factor;
        if ( scfs instanceof Array ) {
            for ( var i = 0; i < scfs.length; i++ ) {
                var cf = Number( scfs[i] );
                if ( !isNaN( cf ) && cf > mf ) { mf = cf; }
            }
        }
        if ( mf < 0 ) { options.maxLevel = Number(Math.ceil(Math.log(Math.max(this.width, this.height), 2))); }
        else { options.maxLevel = mf; }
    }

    $.TileSource.apply( this, [ options ] );
};

$.extend( $.IIIF11TileSource.prototype, $.TileSource.prototype, {
    /**
     * Determine if the data and/or url imply the image service is supported by
     * this tile source.
     * @function
     * @name OpenSeadragon.IIIF11TileSource.prototype.supports
     * @param {Object|Array} data
     * @param {String} optional - url
     */
    supports: function( data, url ){
        return data.profile && (
            "http://library.stanford.edu/iiif/image-api/1.1/compliance.html#level0" == data.profile ||
            "http://library.stanford.edu/iiif/image-api/1.1/compliance.html#level1" == data.profile ||
            "http://library.stanford.edu/iiif/image-api/1.1/compliance.html#level2" == data.profile ||
            "http://library.stanford.edu/iiif/image-api/1.1/compliance.html#level3" == data.profile ||
            "http://library.stanford.edu/iiif/image-api/1.1/compliance.html" == data.profile
        );
    },

    /**
     *
     * @function
     * @name OpenSeadragon.IIIF11TileSource.prototype.configure
     * @param {Object|XMLDocument} data - the raw configuration
     * @param {String} url - the url the data was retreived from if any.
     * @return {Object} options - A dictionary of keyword arguments sufficient
     *      to configure this tile source via it's constructor.
     */
    configure: function( data, url ){
        // var service,
        //     options,
        //     host;


        // options = configureFromObject( this, data );

        // if( url && !options.tilesUrl ){
        //     service = url.split('/');
        //     service.pop(); //info.json
        //     service = service.join('/');
        //     if( 'http' !== url.substring( 0, 4 ) ){
        //         host = location.protocol + '//' + location.host;
        //         service = host + service;
        //     }
        //     options.tilesUrl = service.replace(
        //         data.identifier,
        //         ''
        //     );
        // }

        return configureFromObject( this, data );
    },

    /**
     * Responsible for retreiving the url which will return an image for the
     * region speified by the given x, y, and level components.
     * @function
     * @name OpenSeadragon.IIIF11TileSource.prototype.getTileUrl
     * @param {Number} level - z index
     * @param {Number} x
     * @param {Number} y
     * @throws {Error}
     */
    getTileUrl: function( level, x, y ){

        //# constants
        var IIIF_ROTATION = '0',
            IIIF_QUALITY = 'native.jpg',

            //## get the scale (level as a decimal)
            scale = Math.pow( 0.5, this.maxLevel - level ),

            //# image dimensions at this level
            level_width = Math.ceil( this.width * scale ),
            level_height = Math.ceil( this.height * scale ),

            //## get iiif size
            // Note that this uses pixels rather than percents (as in 
            // IIIF11TileSource), which will be more precise (i.e. the 'right 
            // 50% of 11px' case') and easier to pre-bake without worring about 
            // different browsers' decimal precision (if desired).

            // iiif_size = level_width + "," + level_height,
            iiif_size = this.tileSize + "," + this.tileSize,

            //## iiif region
            iiif_tile_size_width = Math.ceil( this.tileSize / scale ),
            iiif_tile_size_height = Math.ceil( this.tileSize / scale ),
            iiif_region,
            iiif_tile_x,
            iiif_tile_y,
            iiif_tile_w,
            iiif_tile_h;



        if ( level_width < this.tile_width && level_height < this.tile_height ){
            iiif_region = 'full';
        } else {
            iiif_tile_x = x * iiif_tile_size_width;
            iiif_tile_y = y * iiif_tile_size_height;
            iiif_tile_w = Math.min( iiif_tile_size_width, this.width - iiif_tile_x );
            iiif_tile_h = Math.min( iiif_tile_size_height, this.height - iiif_tile_y );
            iiif_region = [ iiif_tile_x, iiif_tile_y, iiif_tile_w, iiif_tile_h ].join(',');
        }

        return [
            this['@id'],
            iiif_region,
            iiif_size,
            IIIF_ROTATION,
            IIIF_QUALITY
        ].join('/');
    }


});


/**
 * @private
 * @inner
 * @function
 *
{
  "@context" : "http://library.stanford.edu/iiif/image-api/1.1/context.json",
  "@id" : "http://iiif.example.com/prefix/1E34750D-38DB-4825-A38A-B60A345E591C",
  "width" : 6000,
  "height" : 4000,
  "scale_factors" : [ 1, 2, 4 ],
  "tile_width" : 1024,
  "tile_height" : 1024,
  "formats" : [ "jpg", "png" ],
  "qualities" : [ "native", "grey" ]
  "profile" : "http://library.stanford.edu/iiif/image-api/1.1/compliance.html#level0" 
} 
 */
function configureFromObject( tileSource, configuration ){
    configuration.tilesUrl = configuration["@id"];
    return configuration;
}

}( OpenSeadragon ));
