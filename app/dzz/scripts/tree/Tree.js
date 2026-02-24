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
                itemclick: me.loadObject, scope: me,
                itemdblclick: me.onDblClick, scope: me
            });

            me.getView().on({
                itemcontextmenu: me.showContextMenu
            });

            me.photosSort = 'DESC';

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
                    },
                    {
                        xtype: 'menucheckitem',
                        checked: true,
                        text: captions['lazyLoad'],
                        bind: {
                            checked: '{lazyLoad}'
                        },
                        checkHandler: function (item, checked) {
                            var appWindow = me.up('window[id=dzzAppWindow]');
                            var centerPanel = appWindow.query('[region=center]');
                            if (centerPanel.length > 0) {
                                centerPanel[0].destroy();
                            }
                            var root = me.getRootNode();
                            root.collapse();
                            root.removeAll();
                            root.set('loaded', false);
                            root.expand();
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
                sorters: [{
                    property: 'path',
                    direction: 'DESC'
                }]
            };

            var store = Ext.create('Ext.data.TreeStore', config);
            store.on({
                beforeload: function (store, operation, eOpts) {
                    store.getProxy().setExtraParam('showPhotos', me.lookupViewModel().get('showPhotos'));
                    store.getProxy().setExtraParam('showVideos', me.lookupViewModel().get('showVideos'));
                    if (me.lookupViewModel().get('lazyLoad')) {
                        var node = operation.node;
                        var nodePath = (node.get('id') === 'rootNode') ? '' : (node.get('path') || '');
                        store.getProxy().setExtraParam('targetAction', 'getTreeLevel');
                        store.getProxy().setExtraParam('nodePath', nodePath);
                    } else {
                        store.getProxy().setExtraParam('targetAction', 'generateDirStruct');
                    }
                }
            });

            me.setStore(store);
            me.getRootNode().expand();
        },

        //loads the center region content
        loadObject: function (view, record) {
            var me = this;
            var lazyLoad = me.lookupViewModel().get('lazyLoad');
            var nodeType = record.get('nodeType');

            // In lazy mode: non-Day collapsed node → do nothing (expand via double-click or arrow)
            if (lazyLoad && nodeType !== 'Day' && !record.isExpanded()) {
                return;
            }

            //destroy the component in the center region of the window - if exist
            var appWindow = me.up('window[id=dzzAppWindow]');
            var centerComponentNotPresent = appWindow.query('[region=center]').length == 0 ? true : false;
            if (!centerComponentNotPresent) {
                appWindow.query('[region=center]')[0].destroy();
            }

            var metaData = me.getObjectMetaData(record.data.id);
            metaData.node = Ext.apply({}, record.data);
            metaData.photosSort = me.photosSort;
            metaData.vm = me.lookupViewModel();

            // In lazy mode: expanded non-Day node → load only photos from visible (loaded) Day nodes
            if (lazyLoad && nodeType !== 'Day' && record.isExpanded()) {
                var dayPaths = me.collectDayPaths(record);
                if (dayPaths.length === 0) {
                    return;
                }
                metaData.node.dayPaths = dayPaths;
            }

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

        // Recursively collect paths of Day leaf nodes that are currently loaded/visible
        // (only descends into expanded nodes — skips collapsed ones)
        collectDayPaths: function (node) {
            var me = this;
            var paths = [];
            node.eachChild(function (child) {
                if (child.get('nodeType') === 'Day') {
                    paths.push(child.get('path'));
                } else if (child.isExpanded()) {
                    paths = paths.concat(me.collectDayPaths(child));
                }
            });
            return paths;
        },

        // In lazy mode: double-click expands a collapsed non-Day node
        onDblClick: function (view, record) {
            var me = this;
            if (!me.lookupViewModel().get('lazyLoad')) {
                return;
            }
            if (record.get('nodeType') === 'Day') {
                return;
            }
            if (!record.isExpanded()) {
                record.expand();
            }
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