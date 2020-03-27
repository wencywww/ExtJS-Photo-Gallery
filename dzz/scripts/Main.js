Ext.onReady(function () {

    Ext.QuickTips.init();

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
            items: [
                {
                    xtype: 'container',
                    region: 'west',
                    layout: {type: 'vbox', align: 'stretch'},
                    items: [
                        {xtype: 'dzzAppNavTree', flex: 1},
                        {xtype: 'indexerButton', anchor: '100%'}
                    ]
                }
            ]
        }
    ).show();


})






