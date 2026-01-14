Ext.onReady(function () {

    //force decimal separator to '.'
    Ext.util.Format.decimalSeparator = '.';

    //global Ext.Ajax postprocessing
    Ext.Ajax.on(
        {
            requestcomplete: function (conn, response) {
                dzz.func.ProcessAjaxExceptions(response);
            },
            requestexception: function (conn, response) {
                dzz.func.ProcessAjaxExceptions(response);
            }
        }
    );

    //allows to set FontAwesome icon color when provided via faIconColor-config
    Ext.define('override.Ext.Component.FontAwesome.IconColor',
        {
            override: 'Ext.Component',
            initComponent: function () {
                var me = this;
                if (!Ext.isEmpty(me.iconCls) && !Ext.isEmpty(me.faIconColor)) {
                    me.on({
                        render: function () {
                            me.setFaIconColor();
                        }
                    });
                }
                me.callParent(arguments);
            },

            setFaIconColor: function () {
                var me = this;
                var el = me.getEl();

                var iconNode = el.selectNode('[class*="' + me.iconCls + '"]', false);

                if (iconNode) {
                    iconNode.applyStyles({color: me.faIconColor});
                }

            }


        });


    //an override that allows for tooltips to be added to any form-fields
    //via the toolTipText configuration
    Ext.define('override.Ext.form.field.Base',
        {
            override: 'Ext.Component',
            initComponent: function () {
                var me = this;
                if (!Ext.isEmpty(me.toolTipText)) {
                    me.on({
                        render: function () {
                            me.createTooltip();
                        }
                    });
                }
                me.callParent(arguments);
            },
            createTooltip: function () {
                var me = this;
                var tip = Ext.create('Ext.tip.ToolTip', {
                    target: me.getEl(),
                    html: me.toolTipText,
                    trackMouse: true,
                    defaultAlign: me.toolTipAlign || 'bl-bl',
                    anchor: me.toolTipAnchor || 'top'
                });
            }


        });


});