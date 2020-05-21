Ext.onReady(function () {

    Ext.QuickTips.init();

    var LOC = dzz.i18n.txt[2];

    Ext.define('dzz.Ext.app.ViewModel', {
        extend: 'Ext.app.ViewModel',
        alias: 'viewmodel.gallery',
        data: {
            showExifData: true, //determine if we want to show EXIF data
            slideExifData: null //keeps the EXIF data for the current slide
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
            defaults: {split: true, useSplitTips: true},
            minHeight: window.innerHeight,
            viewModel: {
                type: 'gallery'
            },
            items: [
                {
                    xtype: 'container',
                    region: 'west',
                    layout: {type: 'vbox', align: 'stretch'},
                    items: [
                        {xtype: 'dzzAppNavTree', flex: 1},
                        {
                            xtype: 'indexerButton', anchor: '100%', iconAlign: 'top', scale: 'medium',
                            iconCls: 'fas fa-play-circle'//, faIconColor: '#ff6900'
                        },
                        {
                            xtype: 'button',
                            //text: 'Upload files...',
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

    Ext.widget('exifManager', {
        viewModel: adminWindow.getViewModel()
    }).show();


})






