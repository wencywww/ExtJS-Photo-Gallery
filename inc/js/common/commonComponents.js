Ext.onReady(function () {
    //Reusable Components

    Ext.ns('dzz.COMPONENTS');

    var LOC = dzz.i18n.txt[4]; //for shortness

    //the main dataview in the center region
    Ext.define('dzz.COMPONENTS.homeGalleryDataView', {
        extend: 'Ext.view.View',

        alias: 'widget.homeGalleryDataView',

        trackOver: true,
        overItemCls: 'dzz-item-over',
        selectedItemCls: 'dzz-item-selected',
        itemSelector: 'div.dzz-thumb-wrapper',
        emptyText: LOC.homeGalleryDataView.emptyText,
        selectionModel: {mode: 'MULTI'},

        store: {
            autoLoad: true,
            type: 'json',
            fields: [
                {name: 'thumbUri'},
                {name: 'realUri'},
                {name: 'fileType'},
                {name: 'caption'}
            ],
            proxy: {
                type: 'ajax',
                url: 'scripts/tree/php/processUploads.php',
                actionMethods: {read: 'POST'},
                extraParams: {targetAction: 'getPhotos'},
                reader: {
                    type: 'json',
                    rootProperty: 'RECORDS'
                }
            }
        },

        initComponent: function () {
            var me = this;
            me.prepareTpl();
            me.callParent(arguments);
            me.getStore().getProxy().setExtraParam('path', me.confData.node.path);
            me.getStore().getProxy().setExtraParam('photosSort', me.confData.photosSort);
            me.on({
                itemcontextmenu: me.showContextMenu,
                itemdblclick: function (view, rec, item, index) {

                    //Starting fancybox entirely programmatically (without data-attributes).
                    //we need to build an array of elements, options and start index required by the $.fancybox.open() method:
                    //https://fancyapps.com/fancybox/3/docs/#api
                    var data = view.getStore().getData(); //the data is Ext.util.Collection
                    var items = [];
                    var dc = '?_dc=' + new Date().getTime(); //disable caching param - to ensure the actual picture is retrieved, for example, if it was rotated
                    data.each(function (item) {
                        var itemObj = {
                            src: item.get('realUri') + dc,
                            opts: {
                                caption: item.get('caption'),
                                thumb: '\'' + item.get('thumbUri') + dc + '\''
                            }
                        };
                        items.push(itemObj);
                    });

                    $.fancybox.open(items, {
                        animationEffect: 'zoom-in-out',
                        animationDuration: 500,
                        loop: true,
                        buttons: [
                            "zoom",
                            "share",
                            "slideShow",
                            "fullScreen",
                            "download",
                            "thumbs",
                            "close"
                        ],
                        x_transitionEffect: "tube",
                        afterShow: function (instance, slide) {
                            me.checkSlideMeta(slide);
                        },
                        afterClose: function (instance, slide) {
                            //console.log('close');
                            me.lookupViewModel().set(
                                {
                                    slideExifData: null,
                                    exifVisualiserVisible: false
                                }
                            );
                        }

                    }, index);
                }
            });
        },

        prepareTpl: function () {
            var me = this;

            var dc = '?_dc=' + new Date().getTime(); //disable caching param - to ensure the actual picture is retrieved, for example, if it was rotated
            var imageTpl = new Ext.XTemplate(
                '<tpl for=".">',
                '<div class="dzz-thumb-wrapper" id="{caption}">',
                '   <a>',
                '       <div class="dzz-thumb-inner-wrapper" title="{caption}">',
                '           <tpl if="fileType == \'photo\'">',
                '               <div class="dzz-thumb-container" style="background-image: url(\'{thumbUri}' + dc + '\');"></div>',
                '           <tpl else>',
                '               <div style="height: 100%; display: flex; align-items: center; justify-content: center;">',
                '                   <video src="{realUri}" poster="{thumbUri}" autoplay muted width="100%"></video>',
                '               </div>',
                '           </tpl>',
                '       </div>',
                '       <div class="dzz-thumb-name">{caption}</div>',
                '   </a>',
                '</div>',
                '</tpl>'
            );

            Ext.apply(me, {tpl: imageTpl});

        },

        showContextMenu: function (view, rec, el, idx, e) {
            var me = this;

            if (view.getSelection().length == 0) //if clicking on an image directly with the right mouse button (it is not selected with the left one first)
            {
                return;
            }

            e.preventDefault();

            Ext.ComponentQuery.query('menu[galleryRole=galleryContextMenu]').forEach(
                function (menuInstance) {
                    menuInstance.destroy();
                }
            );

            var menu = Ext.widget({
                xtype: 'menu',
                galleryRole: 'galleryContextMenu',
                items: [
                    {
                        text: dzz.i18n.common.dateChange,
                        iconCls: 'fas fa-calendar-alt', faIconColor: '#0077ff',
                        handler: function (menuitem) {
                            Ext.widget({
                                    xtype: 'photoDateChange',
                                    recs: view.getSelection(),
                                    currentDate: view.getSelection()[0].get('date')
                                }
                            );
                        }
                    },
                    {
                        text: LOC.homeGalleryDataView.menuRotate,
                        iconCls: 'fas fa-sync-alt', faIconColor: '#008000',
                        menu: {
                            items: [
                                {
                                    //text: 'Rotate 90 deg',
                                    text: LOC.homeGalleryDataView.menuRotate90,
                                    //iconCls: 'dzz-icon-rotate-right',
                                    iconCls: 'fas fa-redo-alt', faIconColor: '#008000',
                                    handler: function () {
                                        me.sendRequest({action: 'rotatePhotos', value: 90, recs: view.getSelection()})
                                    }
                                }, {
                                    //text: 'Rotate -90 deg',
                                    text: LOC.homeGalleryDataView.menuRotateMinus90,
                                    //iconCls: 'dzz-icon-rotate-left',
                                    iconCls: 'fas fa-undo-alt', faIconColor: '#008000',
                                    handler: function () {
                                        me.sendRequest({action: 'rotatePhotos', value: -90, recs: view.getSelection()})
                                    }
                                }, {
                                    //text: 'Rotate 180 deg',
                                    text: LOC.homeGalleryDataView.menuRotate180,
                                    //iconCls: 'dzz-icon-rotate-flip',
                                    iconCls: 'fas fa-retweet', faIconColor: '#008000',
                                    handler: function () {
                                        me.sendRequest({action: 'rotatePhotos', value: 180, recs: view.getSelection()})
                                    }
                                }
                            ]
                        }
                    },
                    {
                        text: LOC.homeGalleryDataView.gpsEdit,
                        //iconCls: 'dzz-icon-calendar',
                        iconCls: 'fas fa-map-marked-alt', faIconColor: '#e94335',
                        handler: function (menuitem) {
                            Ext.widget({
                                    xtype: 'gpseditor',
                                    recs: view.getSelection()
                                }
                            );
                        }
                    },
                    {
                        //text: 'Delete...',
                        text: LOC.homeGalleryDataView.menuDelete,
                        //iconCls: 'dzz-icon-delete',
                        iconCls: 'fas fa-trash', faIconColor: '#ff0000',
                        handler: function () {
                            Ext.Msg.confirm(LOC.homeGalleryDataView.menuDeleteConfirmTitle,
                                view.getSelection().length + LOC.homeGalleryDataView.menuDeleteConfirmText,
                                function (btnText) {
                                    if (btnText === "yes") {
                                        me.sendRequest(
                                            {action: 'deletePhotos', recs: view.getSelection()}
                                        );
                                    }
                                }, view);
                        }
                    }
                ]
            }).showAt(e.getXY(), true);
        },

        sendRequest: function (config) {
            var me = this;

            var data = Ext.Array.pluck(config.recs, 'data');
            var photos = Ext.Array.pluck(data, 'realUri');

            var extraParams = {};
            if (config.action == 'rotatePhotos') {
                extraParams.rotateAngle = config.value;
            }

            Ext.Ajax.request({
                url: 'scripts/tree/php/processUploads.php',
                method: 'POST',
                params: Ext.Object.merge({targetAction: config.action, photos: Ext.encode(photos)}, extraParams),
                callback: function (opts, result, response) {

                    me.getStore().reload();
                    me.prepareTpl();
                    me.refresh();
                    me.up('window').down('treepanel').getStore().reload();
                }
            });

        },

        //2020-05-20: check for and try to extract the image meta data / exif
        checkSlideMeta: function (slide) {
            var me = this;
            var vm = me.lookupViewModel();

            if (!vm.get('showExifData')) {
                return;
            }

            if (slide.type == 'video') { //no need to continue on videos
                vm.set({
                    slideExifData: null
                });
                return;
            }


            var imgSrc = slide.src;
            var imgDataUrl, imgBlob;

            me.on(
                {
                    exifdatachecked: function () {
                        var meta = me.getSlideMeta();
                        if (meta && !vm.get('exifManagerInstantiated')) {
                            Ext.widget('exifManager', {
                                viewModel: vm
                            }).show();
                            vm.set({
                                exifManagerInstantiated: true
                            });
                        }
                    }
                }
            );


            //How does this work:
            //For metadata processing we use the Mattias Wallander's exifReader library - https://github.com/mattiasw/ExifReader
            //It uses JS ArrayBuffer objects to extract the data, so we need to represent our file in this form.
            //However, it's not that easy.
            //In order to bulid the ArrayBuffer, we need the image to be converted to a Blob object.
            //This Blob is sent as an argument to the FileReader.readAsArrayBuffer() method which returns the ArrayBuffer
            //So, how to get the Blob object from the image url?
            //First - we need to convert the url of the image to a base64 encoded dataURL - imgToDataURL() function
            //Second - the resulting string is converted to a Blob - imgDataUrlToBlob()
            //Finally - the Blob is sent to the imgBlobToExifData() which creates the ArrayBuffer, extracts the data,
            //writes it to the me.slideExifData property and fires our custom 'exifdatachecked' event
            //The important point is that all these calls should be made within the imgToDataURL() callback.
            //See commonFunctions.js for more details on these functions. They are somehow universal and that is why
            //live within the common-file

            dzz.func.imgToDataURL(imgSrc, function (result) {
                imgDataUrl = result;
                imgBlob = dzz.func.imgDataUrlToBlob(imgDataUrl);

                dzz.func.imgBlobToExifData(imgBlob, me, function (cmp, exifData) {
                    var me = cmp;

                    vm.set({
                            slideExifData: exifData
                        }
                    );
                    me.fireEvent('exifdatachecked');
                });

            });


        },

        getSlideMeta: function () {
            var me = this;
            var vm = me.lookupViewModel();

            var data = vm.get('slideExifData');

            if (!data.success) {
                return false;
            }
            return data.data;
        }

    });

    //the process files/pinger button in the bottom left
    Ext.define('dzz.COMPONENTS.indexerButton', {
        extend: 'Ext.button.Button',

        alias: 'widget.indexerButton',
        disabled: true,
        scale: 'large',

        initComponent: function () {
            var me = this;
            me.callParent(arguments);

            me.task = {
                run: function () {
                    me.doRequest('ping');
                },
                interval: 5000
            };

            Ext.TaskManager.start(me.task);

            me.setHandler(function () {
                me.doRequest('processUploads');
            });

        },

        doRequest: function (actionType) {
            var me = this;

            Ext.Ajax.setTimeout(30000);

            if (actionType == 'processUploads') {
                me.setDisabled(true);
                me.processing = true;
                me.setText(LOC.indexerButton.processingPhotos); //'Processing photos...'
                Ext.Ajax.setTimeout(120000);
            }

            Ext.Ajax.request({
                url: 'scripts/tree/php/processUploads.php',
                method: 'POST',
                params: {targetAction: actionType},
                callback: function (opts, result, response) {

                    if (actionType == 'processUploads') {
                        me.prev('treepanel').getStore().reload();
                        me.processing = false;
                    } else {
                        var obj = Ext.decode(response.responseText);
                        var details = obj.details;
                        if (!details.status) {
                            me.setDisabled(true);
                            me.setText(LOC.indexerButton.noPhotos); //'Няма снимки за качване'
                        } else {
                            if (me.processing) {
                                me.setDisabled(true);
                                var txt = LOC.indexerButton.processingPhotos + ' (' + details.count + ' ' + LOC.indexerButton.remaining + ')...';
                            } else {
                                me.setDisabled(false);
                                var txt = '<b>' + LOC.indexerButton.newPhotos + ' (' + '<span style="color: #ff0000">' + details.count + '</span>)</b>';
                            }
                            me.setText(txt);
                        }

                        var diskStatusLabel = me.up('window').down('tbtext[dzzRole=diskStatusLabel]');
                        if (diskStatusLabel) {
                            diskStatusLabel.setData(details.diskStatus);
                        }
                    }

                }
            });


        }
    });

    //a small panel for changing the date of the photos
    Ext.define('dzz.COMPONENTS.photoDateChange', {
        extend: 'Ext.form.Panel',
        alias: 'widget.photoDateChange',
        bodyPadding: 3,
        url: 'scripts/tree/php/processUploads.php',
        items: [
            {xtype: 'hiddenfield', name: 'targetAction', value: 'changePhotoDates'},
            {xtype: 'hiddenfield', name: 'photos', value: ''},
            {
                xtype: 'displayfield',
                value: LOC.photoDateChange.displayField
            },
            {
                xtype: 'datefield',
                format: 'd.m.Y',
                submitFormat: 'Y/m/d',
                name: 'targetDate',
                editable: false,
                allowBlank: false,
                value: new Date(),
                fieldLabel: LOC.photoDateChange.dateFieldLbl
            }
        ],
        buttons: [
            {
                text: LOC.photoDateChange.btnWrite,
                //iconCls: 'dzz-icon-ok',
                iconCls: 'fas fa-check', faIconColor: '#008000', scale: 'medium',
                formBind: true,
                handler: function (btn) {
                    btn.up('form').submit();
                }
            },
            {
                text: LOC.photoDateChange.btnCancel,
                //iconCls: 'dzz-icon-delete',
                iconCls: 'fas fa-times', faIconColor: '#ff0000', scale: 'medium',
                handler: function (btn) {
                    btn.up('window').close();
                }
            }
        ],

        initComponent: function () {
            var me = this;
            me.callParent(arguments);
            me.extractData();
            me.showForm();
            me.getForm().on(
                {
                    actioncomplete: function (frm, action) {
                        frm.owner.up('window').close();
                        Ext.getCmp('dzzAppWindow').down('treepanel').getStore().reload();

                        var view = Ext.getCmp('dzzAppWindow').down('homeGalleryDataView');
                        if (view) {
                            view.getStore().reload();
                            view.refresh();
                        }
                    }
                }
            );
        },
        showForm: function () {
            var me = this;
            Ext.widget({
                xtype: 'window',
                iconCls: 'fas fa-calendar-alt',
                modal: true,
                title: LOC.photoDateChange.winTitle,
                items: [me]
            }).show();
        },
        extractData: function () {
            var me = this;
            var data = Ext.Array.pluck(me.recs, 'data');
            var photos = Ext.Array.pluck(data, 'realUri');
            me.down('hiddenfield[name=photos]').setValue(Ext.encode(photos));
            me.down('datefield[name=targetDate]').setValue(new Date(me.currentDate));
        }
    });

    //a drag-n-drop upload window
    Ext.define('dzz.COMPONENTS.photoUploader', {
        extend: 'Ext.panel.Panel',
        alias: 'widget.photoUploader',
        //id: 'photoUploader',
        bodyPadding: 3,
        scrollable: true,
        //html: '<div style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center;" id="galleryUploader"; class="dropzone"></div>',
        html: '<div style="width: 100%; height: 100%;" id="galleryUploader"; class="dropzone"></div>',

        dockedItems: [
            {
                xtype: 'toolbar', dock: 'top',
                items: [
                    {
                        xtype: 'button', //text: 'Close',
                        text: LOC.photoUploader.tbBtnClose,
                        iconAlign: 'left', scale: 'large', iconCls: 'far fa-times-circle', faIconColor: '#ff0000',
                        handler: function (btn) {
                            btn.up('window').close();
                        }
                    },
                    {
                        xtype: 'button', //text: 'Start Uploading Images',
                        text: LOC.photoUploader.tbBtnUpload,
                        iconAlign: 'left', scale: 'large', iconCls: 'fas fa-play-circle', faIconColor: '#008000',
                        handler: function (btn) {
                            btn.up('photoUploader').dzInstance.processQueue();
                        },
                        bind: {
                            disabled: '{dzQueuedFiles <= 0}'
                        }
                    }, '->',
                    {
                        xtype: 'tbtext',
                        bind: {
                            data: {
                                total: '{dzTotalFiles}',
                                succ: '{dzUploadedFiles}',
                                fail: '{dzFailedFiles}',
                                size: '{dzTotalBytes}'
                            }
                        },
                        tpl: LOC.photoUploader.tbLblEnqueued + ': {total}; <span style="color: blue">' +
                        LOC.photoUploader.tbLblUploaded + ': {succ}</span>; <span style="color: red">' +
                        LOC.photoUploader.tbLblFailed + ': {fail}</span>; <b>{size:fileSize()}</b>'
                    },
                    {
                        xtype: 'progressbar', value: 0, width: 300,
                        id: 'pgbar',
                        textTpl: LOC.photoUploader.tbLblProgress + ': {value:percent("0")}', //Ext.util.Format functions are available here in XTemplate
                        bind: {
                            value: '{dzUploadedBytes / dzTotalBytes}',
                            visible: '{progressVisible}'
                        }
                    }
                ]
            }
        ],

        viewModel: {
            data: {
                dzTotalFiles: 0,
                dzQueuedFiles: 0,
                dzUploadedFiles: 0,
                dzFailedFiles: 0,
                dzTotalBytes: 0,
                dzUploadedBytes: 0,
                dzRemovedBytes: 0,
                progressVisible: false
            }
        },

        dzInstance: null,


        initComponent: function () {
            var me = this;

            me.callParent(arguments);

            me.on({
                afterrender: me.initDropZone,
                beforedestroy: me.handleDestroy
            });

            me.showInWindow();


        },

        initDropZone: function () {
            var me = this;

            //console.log('initalizing DropZone.js...');
            var dzConfig = {
                url: 'scripts/tree/php/dropZone/dropZone.php',
                autoProcessQueue: false,
                maxFilesize: null,
                timeout: 120000,
                acceptedFiles: 'image/*,video/*',
                addRemoveLinks: true,
                dictDefaultMessage: ''
            };

            //localize DZ if our locale is not en
            var defMsgPrefix = '<span style="font-size: 2em; color: #cccccc"><i class="fas fa-camera fa-10x"></i><span><br>';
            if (dzz.i18n.locale != 'en') {
                dzConfig = Ext.Object.merge(dzConfig, LOC.photoUploader.dropZone);
                dzConfig.dictDefaultMessage = defMsgPrefix + dzConfig.dictDefaultMessage;
            } else {
                dzConfig.dictDefaultMessage = defMsgPrefix + Dropzone.prototype.defaultOptions.dictDefaultMessage;
            }

            var dropZone = new Dropzone('div#galleryUploader', dzConfig);

            dropZone = me.attachDropZoneListeners(dropZone);

            me.dzInstance = dropZone;
        },

        attachDropZoneListeners: function (dz) {

            var me = this;

            var vm = me.getViewModel();

            dz.on('complete', function () {
                dz.processQueue();
                vm.set('dzQueuedFiles', dz.getQueuedFiles().length);
            });

            dz.on('processing', function () {
                dz.options.autoProcessQueue = true; //otherwise only 2 files will be processed upon processQueue() call (or the value of the parallelUploads config)
                vm.set('progressVisible', true);
            });

            dz.on('queuecomplete', function () {
                dz.options.autoProcessQueue = false;
                //this event is strangely fired by the destroy() call when you open the uploader, drop some files and click the Close button WITHOUT uploading them
                //seems to be the ViewModel is already destroyed at this moment
                if (!vm.isDestroyed) {
                    vm.set('progressVisible', false);
                    vm.set('dzQueuedFiles', dz.getQueuedFiles().length);
                    //dz.removeAllFiles();
                }

            });

            //file uploaded successfully
            dz.on('success', function (file) {
                vm.set('dzUploadedFiles', vm.get('dzUploadedFiles') + 1);
                vm.set('dzUploadedBytes', vm.get('dzUploadedBytes') + file.upload.bytesSent);
                //dz.removeFile(file);
            });

            //file upload failed
            dz.on('error', function () {
                vm.set('dzFailedFiles', vm.get('dzFailedFiles') + 1);
            });

            //file added to dropzone area
            dz.on('addedfile', function (file) {
                vm.set('dzTotalFiles', vm.get('dzTotalFiles') + 1);
                vm.set('dzTotalBytes', vm.get('dzTotalBytes') + file.upload.total);
                Ext.defer(function () {
                    vm.set('dzQueuedFiles', dz.getQueuedFiles().length);
                }, 5);
            });

            //file removed from the dropzone area
            dz.on('removedfile', function (file) {
                vm.set('dzTotalFiles', vm.get('dzTotalFiles') - 1);
                vm.set('dzTotalBytes', vm.get('dzTotalBytes') - file.upload.total);
                vm.set('dzQueuedFiles', dz.getQueuedFiles().length);
            });

            //this is working incorrectly (or at least, the logic is not mine); see https://gitlab.com/meno/dropzone/-/issues/226
            dz.on('totaluploadprogress', function (val, tb, bs) {
                //console.log('Percent: ' + val + '; Total: ' + tb + '; Sent: ' + bs);
                //vm.set('dzTotalProgress', val / 100);
            });

            return dz;
        },

        showInWindow: function () {
            var me = this;

            var winConfig = {
                title: LOC.photoUploader.winTitle,
                width: window.innerWidth * .7,
                height: window.innerHeight * .7,
                layout: {type: 'fit'},
                modal: true,
                iconCls: 'fas fa-upload',
                items: [me]
            };

            Ext.widget('window', winConfig).show();
        },

        handleDestroy: function () {
            var me = this;

            //console.log('entering before destroy...');

            me.dzInstance.destroy(); //destroy DropZone instance

            if (me.getViewModel().get('dzUploadedFiles') > 0) {

                Ext.MessageBox.show({
                    title: LOC.photoUploader.closeDialog.title,
                    msg: LOC.photoUploader.closeDialog.text,
                    buttons: Ext.MessageBox.YESNO,
                    fn: function (btn) {
                        if (btn === 'yes') {
                            Ext.getCmp('dzzAppWindow').down('indexerButton').click();
                            Ext.toast(LOC.photoUploader.closeDialog.toastYes);
                        } else {
                            Ext.toast(LOC.photoUploader.closeDialog.toastNo);
                        }
                    }
                });
            }


        }
    });

    //container for exif data icons
    Ext.define('dzz.COMPONENTS.exifManager', {
        extend: 'Ext.container.Container',
        alias: 'widget.exifManager',

        layout: {
            type: 'hbox'
        },
        floating: true,
        draggable: true,
        shadow: false,
        defaults: {
            margin: 20
        },
        style: {
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '10px'
        },
        items: [
            {
                xtype: 'box',
                dzzRole: 'exif',
                html: '<i style="color: #03408C; cursor: pointer;" class="fas fa-5x fa-info-circle"></i>',
                listeners: {
                    hide: function (cmp) {
                        cmp.getEl().down('i').toggleCls('dzz-fa-background-active', false);
                    }
                }

            },
            {
                xtype: 'box',
                dzzRole: 'map',
                html: '<i style="color: #E94335; cursor: pointer;" class="fas fa-5x fa-map-marker-alt"></i>',
                bind: {
                    hidden: '{!slideExifData.data.gps}'
                },
                listeners: {
                    hide: function (cmp) {
                        cmp.getEl().down('i').toggleCls('dzz-fa-background-active', false);
                    }
                }
            }
        ],

        bind: {
            hidden: '{!showExifData || !slideExifData.success}'
        },

        toFrontOnShow: false,
        initComponent: function () {
            var me = this;
            me.callParent(arguments);

            Ext.util.CSS.createStyleSheet( //adds a white background when an icon is toggled on
                '.dzz-fa-background-active {background-color: rgba(255, 255, 255, 0.3); border-radius: 5px}'
            );

            me.on({
                show: function () {
                    me.getEl().setZIndex(99999);
                    me.setY(window.innerHeight - me.getHeight() - 20, true);

                    var elementExif = me.down('[dzzRole=exif]').getEl();
                    elementExif.down('i').toggleCls('dzz-fa-background-active', false);
                    if (!elementExif.hasListener('click')) { //otherwise the click listener will be executed n+1 times everytime the show() is called
                        elementExif.on(
                            {
                                click: function (e, t, opts) {
                                    var vm = me.getViewModel();
                                    if (!vm.get('exifVisualiserInstantiated')) {
                                        Ext.widget('exifVisualiser', {
                                            viewModel: vm
                                        }).show();
                                        vm.set({exifVisualiserInstantiated: true});
                                    }
                                    vm.set({
                                        exifVisualiserExifVisible: !vm.get('exifVisualiserExifVisible') //to perform exif propertygrid toggling
                                    });
                                    elementExif.down('i').toggleCls('dzz-fa-background-active');
                                }
                            }
                        );
                    }


                    var elementMap = me.down('[dzzRole=map]').getEl();
                    elementMap.down('i').toggleCls('dzz-fa-background', false);

                    if (!elementMap.hasListener('click')) { //otherwise the click listener will be executed n+1 times everytime the show() is called
                        elementMap.on(
                            {
                                click: function (e, t, opts) {
                                    var vm = me.getViewModel();
                                    if (!vm.get('exifVisualiserInstantiated')) {
                                        Ext.widget('exifVisualiser', {
                                            viewModel: vm
                                        }).show();
                                        vm.set({exifVisualiserInstantiated: true});
                                    }
                                    vm.set({
                                        exifVisualiserMapVisible: !vm.get('exifVisualiserMapVisible') //to perform gps gmap panel toggling
                                    });
                                    elementMap.down('i').toggleCls('dzz-fa-background-active');
                                }
                            }
                        );
                    }


                },
                hide: function () {
                    var vm = me.getViewModel();
                    vm.set({
                        exifVisualiserVisible: false,
                        exifVisualiserExifVisible: false,
                        exifVisualiserMapVisible: false
                    });
                }
            });


        },
    });

    //container for displaying Exif data
    Ext.define('dzz.COMPONENTS.exifVisualiser', {
        extend: 'Ext.container.Container',
        alias: 'widget.exifVisualiser',

        width: 300,
        height: window.innerHeight * .66,

        layout: {
            type: 'vbox', align: 'stretch'
        },
        floating: true,
        draggable: true, resizable: true,
        //shadow: false,
        defaults: {
            //margin: 20
            flex: 1
        },
        items: [
            {
                title: LOC.exifVisualiser.exifTitle,
                iconCls: 'fas fa-camera',
                xtype: 'propertygrid',
                source: {},
                bind: {
                    source: '{exifDataFiltered}',
                    hidden: '{!exifVisualiserExifVisible}'
                }
            },
            {
                title: LOC.exifVisualiser.mapTitle,
                iconCls: 'fas fa-map-marker-alt',
                xtype: 'gmappanel',
                gmapType: 'map',
                center: {
                    lat: 0,
                    lng: 0,
                    marker: {title: ''}
                },
                mapOptions: {
                    mapTypeId: google.maps.MapTypeId.ROADMAP
                },
                bind: {
                    center: '{exifMapCenter}',
                    title: LOC.exifVisualiser.mapTitle + ': {exifMapCenter.marker.title}',
                    hidden: '{!exifVisualiserMapVisible}'
                },
                setCenter: function (center) { //handles the 'center' binding
                    var newCenter = center ? center : this.center;
                    this.gmap.setCenter(newCenter);
                    this.gMapMarker.setPosition(newCenter);
                    this.gMapMarker.setTitle(newCenter.marker.title);
                }
            }
        ],

        toFrontOnShow: false,

        bind: {
            hidden: '{!exifVisualiserVisible}'
        },

        initComponent: function () {
            var me = this;
            me.callParent(arguments);

            me.on({
                show: function () {
                    me.getEl().setZIndex(99999);
                    me.setX(window.innerWidth - me.getWidth() - 50, true);
                }
            });


        },
    });

    //Simple Google Maps panel, see: https://docs.sencha.com/extjs/7.2.0/classic/src/GMapPanel.js.html
    //little modifications added
    Ext.define('Ext.ux.GMapPanel', {
        extend: 'Ext.panel.Panel',

        alias: 'widget.gmappanel',

        requires: ['Ext.window.MessageBox'],

        initComponent: function () {
            Ext.applyIf(this, {
                plain: true,
                gmapType: 'map',
                border: false
            });

            this.callParent();
        },

        onBoxReady: function () {
            var center = this.center;

            this.callParent(arguments);

            if (center) {
                if (center.geoCodeAddr) {
                    this.lookupCode(center.geoCodeAddr, center.marker);
                }
                else {
                    this.createMap(center);
                }
            }
            else {
                Ext.raise('center is required');
            }

        },

        createMap: function (center, marker) {
            var options = Ext.apply({}, this.mapOptions);

            /* global google */
            options = Ext.applyIf(options, {
                zoom: 14,
                center: center,
                mapTypeId: google.maps.MapTypeId.HYBRID
            });
            this.gmap = new google.maps.Map(this.body.dom, options);

            if (!marker && center.marker) { //dzz addition
                marker = center.marker;
            }

            if (marker) {
                this.addMarker(Ext.applyIf(marker, {
                    position: center
                }));
            }

            Ext.each(this.markers, this.addMarker, this);
            this.fireEvent('mapready', this, this.gmap);
        },

        addMarker: function (marker) {
            var o;

            marker = Ext.apply({
                map: this.gmap
            }, marker);

            if (!marker.position) {
                marker.position = new google.maps.LatLng(marker.lat, marker.lng);
            }

            o = new google.maps.Marker(marker);

            Ext.Object.each(marker.listeners, function (name, fn) {
                google.maps.event.addListener(o, name, fn);
            });

            this.gMapMarker = o; //dzz addition - we need the Marker instance for changing its position

            return o;
        },

        lookupCode: function (addr, marker) {
            this.geocoder = new google.maps.Geocoder();
            this.geocoder.geocode({
                address: addr
            }, Ext.Function.bind(this.onLookupComplete, this, [marker], true));
        },

        onLookupComplete: function (data, response, marker) {
            if (response !== 'OK') {
                Ext.MessageBox.alert('Error', 'An error occured: "' + response + '"');

                return;
            }

            this.createMap(data[0].geometry.location, marker);
        },

        afterComponentLayout: function (w, h) {
            this.callParent(arguments);
            this.redraw();
        },

        redraw: function () {
            var map = this.gmap;

            if (map) {
                google.maps.event.trigger(map, 'resize');
            }
        }

    });

    //panel for changing the GPS information of the photos
    Ext.define('dzz.COMPONENTS.gpsEditor', {
        extend: 'Ext.form.Panel',
        alias: 'widget.gpseditor',
        bodyPadding: 3,
        url: 'scripts/tree/php/processUploads.php',
        layout: {type: 'hbox', align: 'stretch'},
        viewModel: {
            data: {
                lat: 0,
                lng: 0,
                alt: 0,
                zoom: 0,
                centerMap: true,
                loc_editorActive: false
            },
            formulas: {
                LatLng: function (get) {
                    return {'lat': get('lat'), 'lng': get('lng')};
                }
            },
            stores: {}
        },
        items: [
            {xtype: 'hiddenfield', name: 'targetAction', value: 'setGpsData'},
            {xtype: 'hiddenfield', name: 'photos', value: ''},
            {
                flex: .70,
                xtype: 'gmappanel',
                gmapType: 'map',
                center: {
                    lat: 0,
                    lng: 0,
                    marker: {title: '', animation: google.maps.Animation.DROP}
                },
                mapOptions: {
                    mapTypeId: google.maps.MapTypeId.ROADMAP
                }
            },
            {
                flex: .30,
                xtype: 'container',
                layout: {type: 'vbox', align: 'stretch'},
                items: [
                    {
                        xtype: 'container',
                        layout: {type: 'hbox', pack: 'end', padding: 10},
                        defaults: {
                            allowExponential: false, autoStripChars: true, decimalPrecision: 8,
                            decimalSeparator: '.', allowBlank: false, submitLocaleSeparator: false,
                            minWidth: 255
                        },
                        items: [
                            {
                                xtype: 'checkbox', name: 'gps_lat_update', inputValue: 1,
                                uncheckedValue: 0, value: true,
                                padding: '0 20 0 0', minWidth: undefined
                            },
                            {
                                xtype: 'numberfield',
                                name: 'gps_latitude',
                                minValue: -90,
                                maxValue: 90,
                                fieldLabel: LOC.gpsEditor.latFieldLbl,
                                toolTipText: LOC.gpsEditor.latFieldTip,
                                flex: 1,
                                bind: '{lat}'
                            }
                        ]
                    },
                    {
                        xtype: 'container',
                        layout: {type: 'hbox', pack: 'end', padding: 10},
                        defaults: {
                            allowExponential: false, autoStripChars: true, decimalPrecision: 8,
                            decimalSeparator: '.', allowBlank: false, submitLocaleSeparator: false,
                            minWidth: 255
                        },
                        items: [
                            {
                                xtype: 'checkbox', name: 'gps_lng_update', inputValue: 1,
                                uncheckedValue: 0, value: true,
                                padding: '0 20 0 0', minWidth: undefined
                            },
                            {
                                xtype: 'numberfield',
                                name: 'gps_longitude',
                                minValue: -180,
                                maxValue: 180,
                                fieldLabel: LOC.gpsEditor.lngFieldLbl,
                                toolTipText: LOC.gpsEditor.lngFieldTip,
                                flex: 1,
                                bind: '{lng}'
                            }
                        ]
                    },
                    {
                        xtype: 'container',
                        layout: {type: 'hbox', pack: 'end', padding: 10},
                        defaults: {
                            allowExponential: false, autoStripChars: true, decimalPrecision: 8,
                            decimalSeparator: '.', allowBlank: false, submitLocaleSeparator: false,
                            minWidth: 255
                        },
                        items: [
                            {
                                xtype: 'checkbox', name: 'gps_alt_update', inputValue: 1,
                                uncheckedValue: 0, value: true,
                                padding: '0 20 0 0', minWidth: undefined
                            },
                            {
                                xtype: 'numberfield',
                                name: 'gps_altitude',
                                fieldLabel: LOC.gpsEditor.altFieldLbl,
                                toolTipText: LOC.gpsEditor.altFieldTip,
                                flex: 1,
                                bind: '{alt}'
                            }
                        ]
                    },
                    {
                        xtype: 'checkbox',
                        name: 'gps_elevation_api',
                        inputValue: 1,
                        uncheckedValue: 0,
                        value: true,
                        //boxLabel: 'Use elevation API (elevation-api.io)',
                        boxLabel: LOC.gpsEditor.elevationAPI,
                        toolTipText: LOC.gpsEditor.elevationAPITip,
                        padding: '0 0 0 10'
                    },
                    {
                        xtype: 'checkbox',
                        name: 'gps_preserve_existing',
                        inputValue: 1,
                        uncheckedValue: 0,
                        value: true,
                        boxLabel: LOC.gpsEditor.preserveExisting,
                        toolTipText: LOC.gpsEditor.preserveExistingTip,
                        padding: '0 0 0 10'
                    },
                    {
                        xtype: 'fieldset', title: 'My Locations', title: LOC.gpsEditor.locationsTitle,
                        layout: {type: 'vbox', align: 'stretch'},
                        padding: 10,
                        items: [
                            {
                                xtype: 'combobox',
                                fieldLabel: 'Saved Locations',
                                fieldLabel: LOC.gpsEditor.locationsComboLbl,
                                labelAlign: 'top',
                                displayField: 'name',
                                valueField: 'id', //queryMode: 'local',
                                forceSelection: true,
                                anyMatch: true,
                                reference: 'loc_locationsCombo',
                                publishes: 'selection',
                                bind: {
                                    disabled: '{loc_editorActive}'
                                }
                            },
                            {
                                xtype: 'container',
                                layout: {type: 'hbox', align: 'stretch', pack: 'end'},
                                defaults: {xtype: 'button'},
                                items: [
                                    {
                                        text: 'Add New', text: LOC.gpsEditor.locationsBtnNew,
                                        iconCls: 'fas fa-plus', faIconColor: '#008000',
                                        handler: function (btn) {
                                            var mode = btn.lookupViewModel().get('loc_editorActive');
                                            var vm = btn.lookupViewModel();
                                            vm.set('loc_locationName', '');
                                            vm.set('loc_editorActive', !mode);
                                            vm.set('loc_editLocationMode', 'add');
                                        }
                                    },
                                    {
                                        text: 'Edit Current', text: LOC.gpsEditor.locationsBtnEdit,
                                        iconCls: 'fas fa-edit', faIconColor: '#ff6900',
                                        handler: function (btn) {
                                            var mode = btn.lookupViewModel().get('loc_editorActive');
                                            var vm = btn.lookupViewModel();
                                            //if clicked after Add New, this will be empty, so it need to be retrieved from the combo
                                            vm.set('loc_locationName', vm.get('loc_locationsCombo.selection').get('name'));
                                            vm.set('loc_editorActive', !mode);
                                            vm.set('loc_editLocationMode', 'edit');
                                        },
                                        bind: {
                                            hidden: '{loc_locationsCombo.selection == null}'
                                        }
                                    },
                                    {
                                        text: 'Delete Current', text: LOC.gpsEditor.locationsBtnDelete,
                                        iconCls: 'fas fa-times', faIconColor: '#ff0000',
                                        handler: function (btn) {
                                            var vm = btn.lookupViewModel();
                                            var rec = vm.get('loc_locationsCombo.selection');
                                            Ext.Msg.confirm(
                                                LOC.gpsEditor.locationsDeleteConfirm,
                                                LOC.gpsEditor.locationsDeleteConfirm + ': "' + rec.get('name') + '"?',
                                                function (btn) {
                                                    if (btn == 'yes') {
                                                        rec.erase({
                                                            callback: function () {
                                                                vm.getStore('locations').reload();
                                                            }
                                                        });
                                                    }
                                                },
                                                btn
                                            );
                                        },
                                        bind: {
                                            hidden: '{loc_locationsCombo.selection == null}'
                                        }
                                    }
                                ],
                                bind: {
                                    disabled: '{loc_editorActive}'
                                }
                            },
                            {
                                xtype: 'fieldcontainer',
                                fieldLabel: 'Location Name',
                                fieldLabel: LOC.gpsEditor.locationsEditorLbl,
                                labelAlign: 'top',
                                layout: {type: 'hbox'},
                                items: [
                                    {
                                        xtype: 'textfield',
                                        flex: 1,
                                        bind: '{loc_locationName}',
                                        reference: 'loc_editLocationName',
                                        publishes: 'value'
                                        //allowBlank: false
                                    },
                                    {
                                        xtype: 'button', //text: 'Save',
                                        iconCls: 'fas fa-check', faIconColor: '#008000',
                                        handler: function (btn) {
                                            var vm = btn.lookupViewModel();
                                            var mode = vm.get('loc_editLocationMode');

                                            if (mode == 'add') {
                                                var rec = new dzz.Models.Locations({
                                                    'lat': vm.get('lat'), 'lng': vm.get('lng'),
                                                    'alt': vm.get('alt'), 'zoom': vm.get('zoom'),
                                                    'name': vm.get('loc_editLocationName.value')
                                                });
                                                rec.save();
                                                vm.getStore('locations').reload();
                                                vm.set('loc_editorActive', false);
                                            }
                                            if (mode == 'edit') {
                                                var rec = vm.get('loc_locationsCombo.selection');
                                                rec.set({
                                                    'lat': vm.get('lat'), 'lng': vm.get('lng'),
                                                    'alt': vm.get('alt'), 'zoom': vm.get('zoom'),
                                                    'name': vm.get('loc_editLocationName.value')
                                                });
                                                rec.save();
                                                //vm.getStore('locations').reload();
                                                vm.set('loc_editorActive', false);
                                            }
                                        },
                                        bind: {
                                            hidden: '{!loc_editLocationName.value}'
                                        }
                                    }, {
                                        xtype: 'button', //text: 'Cancel',
                                        iconCls: 'fas fa-times', faIconColor: '#ff0000',
                                        handler: function (btn) {
                                            btn.lookupViewModel().set('loc_editorActive', false);
                                        }
                                    }
                                ],
                                bind: {
                                    hidden: '{!loc_editorActive}'
                                }
                            }
                        ]
                    }


                ]
            }

        ],
        buttons: [
            {
                text: LOC.photoDateChange.btnWrite,
                //iconCls: 'dzz-icon-ok',
                iconCls: 'fas fa-check', faIconColor: '#008000', scale: 'medium',
                formBind: true,
                handler: function (btn) {
                    btn.up('form').submit();
                },
                bind: {
                    disabled: '{loc_editorActive}'
                }
            },
            {
                text: LOC.photoDateChange.btnCancel,
                //iconCls: 'dzz-icon-delete',
                iconCls: 'fas fa-times', faIconColor: '#ff0000', scale: 'medium',
                handler: function (btn) {
                    btn.up('window').close();
                }
            }
        ],

        initComponent: function () {
            var me = this;

            me.callParent(arguments);
            me.extractData();
            me.showForm();
            me.getForm().on(
                {
                    actioncomplete: function (frm, action) {
                        frm.owner.up('window').close();
                        Ext.getCmp('dzzAppWindow').down('treepanel').getStore().reload();

                        var view = Ext.getCmp('dzzAppWindow').down('homeGalleryDataView');
                        if (view) {
                            view.getStore().reload();
                            view.refresh();
                        }
                    }
                }
            );
            me.adjustMapSettings();
            me.getSavedLocations();
        },

        showForm: function () {
            var me = this;
            Ext.widget({
                xtype: 'window',
                modal: true,
                title: LOC.gpsEditor.winTitle,
                items: [me],
                layout: {type: 'fit'},
                width: window.innerWidth * .5,
                height: window.innerHeight * .5,
                minWidth: 1025,
                minHeight: 470,
                iconCls: 'fas fa-map-marker-alt'//, faIconColor: '#e94335',
            }).show();
        },

        extractData: function () {
            var me = this;
            var data = Ext.Array.pluck(me.recs, 'data');
            var photos = Ext.Array.pluck(data, 'realUri');
            me.down('hiddenfield[name=photos]').setValue(Ext.encode(photos));
        },

        //options to adjust for the Google Maps Panel:
        //The idea is the desired coordinates to be editable via both draggable Maps Marker and ExtJS number fields
        //The fields and map center are bound to a ViewModel
        adjustMapSettings: function () {
            var me = this;
            var vm = me.getViewModel();

            var map = me.down('gmappanel').gmap;
            var marker = me.down('gmappanel').gMapMarker;

            //We need to be able to drag the marker
            marker.setDraggable(true);

            //Centers the map and it's marker depending on the ViewModel data
            var centerMap = function () {
                if (vm.get('centerMap')) {
                    map.setCenter(vm.get('LatLng'));
                    map.setZoom(vm.get('zoom'));
                    marker.setPosition(vm.get('LatLng'));
                }
            }

            //This bind is listening for changes on the ViewModel values
            //and centers the map if needed. This is the way to listen to the ViewModel changes
            //as the class itself don't have events
            var bind = vm.bind(['{lat}', '{lng}'], centerMap);

            //When the drag is started (and not finished), we disable the map centering,
            //otherwise it will try to center itself many times which is confusing...
            marker.addListener('dragstart', function () {
                vm.set('centerMap', false);
            });

            //... but the numberfields in the form are updated
            marker.addListener('drag', function () {
                vm.set({
                    lat: marker.getPosition().lat(),
                    lng: marker.getPosition().lng()
                });
            });

            //when the drag ends - we simply permit the centering
            //and we need to call the centerMap function,
            //because at this point the ViewModel is already recalculated and the above bind will not execute it
            marker.addListener('dragend', function () {
                vm.set('centerMap', true);
                centerMap();
                me.setElevation();
            });

            map.addListener('zoom_changed', function () {
                vm.set('zoom', map.getZoom());
            });


        },

        //attempts to get the elevation based on a latitude/longitude
        //currently uses the https://elevation-api.io service
        setElevation: function () {
            var me = this;
            var vm = me.getViewModel();

            if (!me.down('checkbox[name=gps_elevation_api]').checked) {
                return;
            }

            var apiUrl = 'https://elevation-api.io/api/elevation?points=(' + vm.get('lat') + ',' + vm.get('lng') + ')';

            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function () {
                if (this.readyState == 4 && this.status == 200) { //request successful
                    var resp = JSON.parse(this.responseText);
                    var altitude = resp.elevations[0].elevation;
                    if (altitude !== false) {
                        vm.set('alt', altitude);
                    }
                    //console.log(altitude);
                }

            }
            xhttp.timeout = 3000; //wait 3 seconds for response
            xhttp.open('GET', apiUrl, true);
            xhttp.send();
        },

        //creates a store for the My Locations combobox
        getSavedLocations: function () {
            var me = this;
            var vm = me.getViewModel();

            var combo = me.down('combobox');

            if (!dzz.Models || !dzz.Models.Locations) {
                Ext.define('dzz.Models.Locations', {
                    extend: 'Ext.data.Model',
                    fields: [
                        {name: 'id', type: 'int'},
                        'name',
                        {name: 'lat', type: 'float'},
                        {name: 'lng', type: 'float'},
                        {name: 'alt', type: 'float'},
                        {name: 'zoom', type: 'int'}
                    ],
                    proxy: {
                        type: 'ajax',
                        actionMethods: {read: 'POST'},
                        extraParams: {targetAction: 'manageSavedLocations'},
                        api: {
                            create: 'scripts/tree/php/processUploads.php?actionType=create',
                            read: 'scripts/tree/php/processUploads.php?actionType=read',
                            update: 'scripts/tree/php/processUploads.php?actionType=update',
                            destroy: 'scripts/tree/php/processUploads.php?actionType=destroy'
                        },
                        reader: {
                            type: 'json',
                            rootProperty: 'RECORDS'
                        },
                        writer: {
                            type: 'json',
                            rootProperty: 'data',
                            encode: true
                        }
                    }
                });
            }

            var store = Ext.create('Ext.data.Store', {
                model: 'dzz.Models.Locations',
                autoLoad: true,
                sorters: [
                    {property: 'id', direction: 'DESC'} //last added location to the top
                ]
            });

            vm.setStores({locations: store});

            combo.setBind({store: '{locations}'});
            combo.on({
                select: function (combo, rec) {
                    //console.log('combo selection');
                    //console.log(rec);
                    vm.set({
                        lat: rec.get('lat'), lng: rec.get('lng'), alt: rec.get('alt'), zoom: rec.get('zoom'),
                        loc_locationID: rec.get('id'), loc_locationName: rec.get('name')
                    });
                }
            });

            //auto-select the most-recent location within the store (they are sorted server-side)
            store.on({
                load: function (store, recs) {
                    //console.log('combo loading');
                    if (recs.length > 0) {
                        combo.select(recs.length - 1);
                        combo.fireEvent('select', combo, recs[recs.length - 1]);
                        combo.queryMode = 'local'; //to search the store without going to the server
                    }
                }
            });


        }

    });

});
