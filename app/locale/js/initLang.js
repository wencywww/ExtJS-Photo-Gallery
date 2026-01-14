Ext.onReady(function () {
    Ext.ns('dzz.i18n');

    Ext.Ajax.request({
        //IMPORTANT: initLang.js is included in login/login.php and dzz/index.html which are in the same depth in relation to the app root.
        //Otherwise th url config below will not work as expected
        url: '../locale/php/getJSStrings.php',
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