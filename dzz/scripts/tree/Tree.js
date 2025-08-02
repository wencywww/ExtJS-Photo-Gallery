Ext.onReady(function () {

    var captions = dzz.i18n.txt[1];

    Ext.define('dzz.Trees.ssAppNavTree', {
        extend: 'Ext.tree.Panel',
        alias: 'widget.dzzAppNavTree',
        title: captions['navTreeTitle'],
        iconCls: 'fas fa-file-alt',

        width: 250,
        minSize: 100,
        maxSize: 300,
        useArrows: true,
        lines: false,
        rowLines: true,
        autoScroll: true, animate: true,
        containerScroll: true,
        rootVisible: true,
        viewConfig: {
            stripeRows: true,
            loadMask: {
                msg: dzz.i18n.common.loadingTxt
            }
        },
        tools: [
            {
                type: 'gear', //tooltip: captions['settings'],
                callback: function (panel, tool) {
                    panel.settingsMenu.showBy(tool);
                }
            },
            {
                type: 'down', tooltip: captions['sortASC'],
                callback: function (panel) {
                    panel.getStore().sort('path', 'ASC');
                    panel.photosSort = 'ASC';
                }
            },
            {
                type: 'up', tooltip: captions['sortDESC'],
                callback: function (panel) {
                    panel.getStore().sort('path', 'DESC');
                    panel.photosSort = 'DESC';
                }
            }
        ],

        initComponent: function () {
            var me = this;

            me.callParent(arguments);
            me.createTreeStore();

            me.on({
                itemclick: me.loadObject, scope: me
            });

            me.getView().on({
                itemcontextmenu: me.showContextMenu
            });

            me.photosSort = 'ASC';

            me.settingsMenu = Ext.widget('menu', {
                viewModel: me.lookupViewModel(),
                items: [
                    {
                        xtype: 'menucheckitem',
                        checked: true,
                        text: captions['showExif'],
                        bind: {
                            checked: '{showExifData}'
                        }
                    },
                    {
                        xtype: 'menucheckitem',
                        checked: true,
                        text: captions['indicateGpsLocation'],
                        bind: {
                            hidden: '{!showExifData}',
                            checked: '{indicateGpsLocation}'
                        }
                    },
                    {
                        xtype: 'menucheckitem',
                        checked: true,
                        text: captions['showPhotos'],
                        bind: {
                            checked: '{showPhotos}'
                        },
                        checkHandler: function (item, checked) {
                            me.getStore().reload();
                            if (Ext.ComponentQuery.query('homeGalleryDataView').length > 0) {
                                Ext.ComponentQuery.query('homeGalleryDataView')[0].getStore().reload();
                            }
                        }
                    },
                    {
                        xtype: 'menucheckitem',
                        checked: true,
                        text: captions['showVideos'],
                        bind: {
                            checked: '{showVideos}'
                        },
                        checkHandler: function (item, checked) {
                            me.getStore().reload();
                            if (Ext.ComponentQuery.query('homeGalleryDataView').length > 0) {
                                Ext.ComponentQuery.query('homeGalleryDataView')[0].getStore().reload();
                            }
                        }
                    },
                    {
                        xtype: 'menucheckitem',
                        checked: false,
                        text: captions['autoPlayVideos'],
                        bind: {
                            checked: '{autoPlayVideos}'
                        },
                        checkHandler: function (item, checked) {
                            if (Ext.ComponentQuery.query('homeGalleryDataView').length > 0) {
                                Ext.ComponentQuery.query('homeGalleryDataView')[0].getStore().reload();
                            }
                        }
                    },
                    {
                        xtype: 'menucheckitem',
                        checked: false,
                        text: captions['paginateDataView'],
                        bind: {
                            checked: '{paginateDataView}'
                        },
                        checkHandler: function (item, checked) {
                            if (Ext.ComponentQuery.query('ux-gridpager[dzz_role=galleryPager]').length > 0) {
                                Ext.ComponentQuery.query('ux-gridpager[dzz_role=galleryPager]')[0].setHidden(!checked);
                            }
                        }
                    }
                ]
            });

        },

        createTreeStore: function () {
            var me = this;
            var config = {
                storeId: 'treeStore',
                fields: [
                    {
                        name: 'text',
                        convert: function (v, rec) {
                            if (rec.get('nodeType') == 'Day') {
                                return Ext.Date.format(Ext.Date.parse(rec.get('path'), 'Y/m/d'), 'd.m.Y, D') + ' (' + rec.get('items') + ')';
                            } else if (rec.get('path') && rec.get('path').indexOf('/') != -1) {
                                return Ext.Date.format(Ext.Date.parse(rec.get('path'), 'Y/m'), 'F, Y');
                            } else {
                                return v;
                            }

                        }
                    }
                ],
                proxy: {
                    type: 'ajax',
                    url: 'scripts/tree/php/processUploads.php',
                    extraParams: { targetAction: 'generateDirStruct' },
                    actionMethods: { read: 'POST' },
                    reader: {
                        type: 'json',
                        rootProperty: 'RECORDS'
                    }
                },
                root: {
                    text: captions['rootNodeText'],
                    id: 'rootNode',
                    path: '',
                    expanded: false,
                    expandable: true
                },
                sorters: 'path',
            };

            var store = Ext.create('Ext.data.TreeStore', config);
            store.on({
                beforeload: function (store, operation, eOpts) {
                    store.getProxy().setExtraParam('showPhotos', me.lookupViewModel().get('showPhotos'));
                    store.getProxy().setExtraParam('showVideos', me.lookupViewModel().get('showVideos'));
                }
            });

            me.setStore(store);
            me.getRootNode().expand();
        },

        //loads the center region content
        loadObject: function (view, record) {
            var me = this;

            //destroy the component in the center region of the window - if exist
            var appWindow = me.up('window[id=dzzAppWindow]');
            var centerComponentNotPresent = appWindow.query('[region=center]').length == 0 ? true : false;
            if (!centerComponentNotPresent) {
                appWindow.query('[region=center]')[0].destroy();
            }

            var metaData = me.getObjectMetaData(record.data.id);
            metaData.node = record.data;
            metaData.photosSort = me.photosSort;
            metaData.vm = me.lookupViewModel();

            var view = Ext.widget('homeGalleryDataView', { confData: metaData });

            appWindow.add({
                xtype: 'panel', scrollable: 'y', region: 'center',
                items: [
                    view
                ],
                dockedItems: [
                    {
                        xtype: 'toolbar',
                        dzzRole: 'statusbar',
                        dock: 'bottom',
                        items: [
                            { xtype: 'tbfill' },
                            {
                                xtype: 'tbtext',
                                dzzRole: 'diskStatusLabel',
                                data: {},
                                tpl: '<b>' + dzz.i18n.common.filesCount + ':</b> {filesCount} / {totalSize}; <b>' + dzz.i18n.common.diskStatus + ':</b> {diskFreeSpace} / {diskTotalSpace}, {freePercent}'
                            }

                        ]
                    }
                ]
            });

        },

        getObjectMetaData: function (targetObj) {
            var me = this;
            var params = Ext.Object.merge({ 'targetObject': targetObj });

            var requestResult, requestResponseText;

            Ext.Ajax.request({
                url: 'scripts/tree/php/getObjectMetaData.php',
                async: false,
                params: params,
                scope: me.getObjectMetaData,
                callback: function (opt, result, response) {
                    requestResult = result;
                    requestResponseText = response.responseText;
                }
            });

            return Ext.decode(requestResponseText, true);


        },

        showContextMenu: function (view, rec, el, idx, e) {
            var me = this;

            if (rec.get('nodeType') !== 'Day') {
                return;
            }

            var dataView = view.up('window').down('homeGalleryDataView');
            if (!dataView || dataView.getStore().getCount() == 0) {
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
                        handler: function () {
                            Ext.widget({
                                xtype: 'photoDateChange',
                                recs: dataView.getStore().getRange(), //returns all store records
                                currentDate: rec.get('path')
                            }
                            );
                        }
                    },
                    {
                        text: dzz.i18n.txt[4].homeGalleryDataView.gpsEdit,
                        iconCls: 'fas fa-map-marked-alt', faIconColor: '#e94335',
                        handler: function () {
                            Ext.widget({
                                xtype: 'gpseditor',
                                recs: dataView.getStore().getRange() //returns all store records
                            }
                            );
                        }
                    }
                ]
            }).showAt(e.getXY(), true);
        }
    });


});