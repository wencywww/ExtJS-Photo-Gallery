Ext.onReady(function () {

    Ext.QuickTips.init();

    var LOC = dzz.i18n.txt[2];

    //our global app-wide ViewModel
    Ext.define('dzz.Ext.app.ViewModel', {
        extend: 'Ext.app.ViewModel',
        alias: 'viewmodel.gallery',
        data: {
            showExifData: true, //determine if we want to show EXIF data
            slideExifData: null, //keeps the EXIF data for the current slide
            exifManagerInstantiated: false, //tracks if the 2-icons container in the bottom center of the screen is already instantiated
            exifVisualiserInstantiated: false, //tracks if the container holding the exif propertygrid and the gmap-panel is already instantiated
            exifVisualiserVisible: false, //tracks if the container holding the exif propertygrid and the gmap-panel is visible
            exifVisualiserExifVisible: false, //tracks if the exif-data property grid is visible
            exifVisualiserMapVisible: false, //tracks if the gmap panel is visible
            exifMapCenter: null, //the data object for current slide's gps data
            //2025-08-01:
            indicateGpsLocation: true, //indicates if we want to show the location indicator on the thumbnails
            showPhotos: true, //determines if we want to show the photos in the gallery
            showVideos: true, //determines if we want to show the videos in the gallery
            autoPlayVideos: false, //determines if we want to autoplay the videos in the gallery - may be very slow on some devices
            paginateDataView: false, //determines if we want to paginate the data view
        },
        formulas: {
            exifDataFiltered: function (get) {
                var exif = get('slideExifData.data.exif');
                var retObj = {};
                Ext.Object.each(exif, function (key, val) {
                    if (val.description) {
                        retObj[key] = val.description;
                    }
                });
                return retObj;
            },
            exifVisualiserVisible: function (get) {
                return get('exifVisualiserExifVisible') || get('exifVisualiserMapVisible');
            },
            exifMapCenter: function (get) {
                var gps = get('slideExifData.data.gps');
                if (!gps) {
                    this.set({ exifVisualiserMapVisible: false });
                    return null;
                }
                return {
                    lat: gps.Latitude,
                    lng: gps.Longitude,
                    marker: { title: Ext.util.Format.number(gps.Latitude, '0.00') + ' / ' + Ext.util.Format.number(gps.Longitude, '0.00') + ' / Altitude: ' + gps.Altitude + ' m' }
                };
            }
        }
    });

    var adminWindow = Ext.create('Ext.window.Window',
        {
            id: 'dzzAppWindow',
            title: '<div style="text-align: center;">' + dzz.i18n.common.GALLERY_TITLE + '</div>',
            maximized: true,
            closable: false,
            onEsc: Ext.emptyFn,
            resizable: false,
            draggable: false,
            layout: 'border',
            defaults: { split: true, useSplitTips: true },
            minHeight: window.innerHeight,
            viewModel: {
                type: 'gallery'
            },
            items: [
                {
                    xtype: 'container',
                    region: 'west',
                    layout: { type: 'vbox', align: 'stretch' },
                    items: [
                        { xtype: 'dzzAppNavTree', flex: 1 },
                        {
                            xtype: 'indexerButton', anchor: '100%', iconAlign: 'top', scale: 'medium',
                            iconCls: 'fas fa-play-circle'//, faIconColor: '#ff6900'
                        },
                        {
                            xtype: 'button',
                            text: LOC.btnStartUploader,
                            scale: 'medium',
                            iconAlign: 'top',
                            iconCls: 'fas fa-upload',
                            //faIconColor: '#008000',
                            handler: function () {
                                Ext.widget('photoUploader');
                            }
                        }

                    ]
                }
            ]
        }
    ).show();

})






