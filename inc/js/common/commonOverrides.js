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


});