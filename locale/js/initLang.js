Ext.onReady(function () {
    Ext.ns('dzz.i18n');

    Ext.Ajax.request({
        url: '/locale/php/getJSStrings.php',
        async: false,
        params: {},
        success: function (response) {
            var text = response.responseText;
            text = Ext.decode(text);

            dzz.i18n.locale = text.Locale;
            dzz.i18n.txt = text.Captions;
            dzz.i18n.common = text.CommonCaptions;
        }

    });

});