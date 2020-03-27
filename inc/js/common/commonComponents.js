Ext.onReady(function () {
    //ДЕФИНИЦИИ НА РЕЮЗЪБЪЛНИ КОМПОНЕНТИ

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
                {name: 'caption'}
            ],
            proxy: {
                type: 'ajax',
                url: '/dzz/scripts/tree/php/processUploads.php',
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
                    //we need to build an array of elements, options and start index use for the $.fancybox.open() method:
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
                        x_transitionEffect: "tube"
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
                '           <div class="dzz-thumb-container" style="background-image: url(\'{thumbUri}' + dc + '\');"></div>',
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
                        iconCls: 'dzz-icon-calendar',
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
                        iconCls: 'dzz-icon-rotate',
                        menu: {
                            items: [
                                {
                                    //text: 'Rotate 90 deg',
                                    text: LOC.homeGalleryDataView.menuRotate90,
                                    iconCls: 'dzz-icon-rotate-right',
                                    handler: function () {
                                        me.sendRequest({action: 'rotatePhotos', value: 90, recs: view.getSelection()})
                                    }
                                }, {
                                    //text: 'Rotate -90 deg',
                                    text: LOC.homeGalleryDataView.menuRotateMinus90,
                                    iconCls: 'dzz-icon-rotate-left',
                                    handler: function () {
                                        me.sendRequest({action: 'rotatePhotos', value: -90, recs: view.getSelection()})
                                    }
                                }, {
                                    //text: 'Rotate 180 deg',
                                    text: LOC.homeGalleryDataView.menuRotate180,
                                    iconCls: 'dzz-icon-rotate-flip',
                                    handler: function () {
                                        me.sendRequest({action: 'rotatePhotos', value: 180, recs: view.getSelection()})
                                    }
                                }
                            ]
                        }
                    },
                    {
                        //text: 'Delete...',
                        text: LOC.homeGalleryDataView.menuDelete,
                        iconCls: 'dzz-icon-delete',
                        handler: function () {

                            Ext.Msg.confirm(LOC.homeGalleryDataView.menuDeleteConfirmTitle, view.getSelection().length + LOC.homeGalleryDataView.menuDeleteConfirmText, function (btnText) {
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
                url: '/dzz/scripts/tree/php/processUploads.php',
                method: 'POST',
                params: Ext.Object.merge({targetAction: config.action, photos: Ext.encode(photos)}, extraParams),
                callback: function (opts, result, response) {

                    me.getStore().reload();
                    me.prepareTpl();
                    me.refresh();
                    me.up('window').down('treepanel').getStore().reload();
                }
            });

        }

    });

    //the button in the far bottom left
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
                url: '/dzz/scripts/tree/php/processUploads.php',
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
        url: '/dzz/scripts/tree/php/processUploads.php',
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
                //fieldLabel: 'Нова дата',
                fieldLabel: LOC.photoDateChange.dateFieldLbl
            }
        ],
        buttons: [
            {
                text: LOC.photoDateChange.btnWrite,
                iconCls: 'dzz-icon-ok',
                formBind: true,
                handler: function (btn) {
                    btn.up('form').submit();
                }
            },
            {
                text: LOC.photoDateChange.btnCancel,
                iconCls: 'dzz-icon-delete',
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
                modal: true,
                //title: 'СМЯНА НА ДАТА НА СНИМКИ',
                title: 'СМЯНА НА ДАТА НА СНИМКИ',
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


});
