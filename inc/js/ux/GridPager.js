Ext.onReady(function () {


    Ext.define('Ext.ux.External.GridPager', {
        extend: 'Ext.toolbar.Paging',
        alias: 'widget.ux-gridpager',
        dock: 'bottom',
        displayInfo: true,
        config: {
            numberFieldPrefix: dzz.i18n.txt[5].gridPager['pageSize'],
            numberFieldTip: dzz.i18n.txt[5].gridPager['pageSizeTip']
        },

        items: [],

        initComponent: function () {
            var me = this;

            me.addItems();
            me.on({
                afterrender: function () {
                    me.queryById('itemsPerPage').setValue(me.store.pageSize);
                }
            });
            me.callParent(arguments);
        },

        addItems: function () {
            var me = this;
            var items = [
                { xtype: 'tbseparator' },
                me.getNumberFieldPrefix(),
                {
                    xtype: 'numberfield',
                    id: 'itemsPerPage',
                    width: 150,
                    allowDecimals: false,
                    allowExponential: false,
                    toolTipText: me.getNumberFieldTip(),
                    toolTipAnchor: 'top',
                    enableKeyEvents: true,
                    step: 10,
                    minValue: 2,
                    maxValue: 10000,
                    autoStripChars: true,
                    allowBlank: false,
                    maxLength: 5,
                    enforceMaxLength: true,
                    listeners: {
                        keydown: function (fld, e) {
                            var k = e.getKey();
                            if (k == e.ENTER) {
                                this.up('pagingtoolbar').refreshGrid();
                            }
                        }
                    }
                }
            ];

            Ext.apply(me, { items: items });
        },

        refreshGrid: function () {
            var me = this;
            var store = me.getStore();
            var numField = me.down('numberfield[id=itemsPerPage]');
            var desiredValue = numField.getValue();
            var fallbackValue = 2;

            if (desiredValue >= 2 && desiredValue <= 10000) {
                store.pageSize = desiredValue;
                store.loadPage(1);
            } else {
                numField.setValue(fallbackValue);
            }
        }
    });

});