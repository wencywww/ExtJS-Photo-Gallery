Ext.onReady(function () {

    var LOC = dzz.i18n.common;

    //Commonly use JS functions
    Ext.define('dzz.func',
        {
            singleton: true, //instantiate it immediately

            ShowErrorMsg: function (msgTitle, msgText) {
                var msg = Ext.create('Ext.window.MessageBox', {
                    closeAction: 'destroy', listeners: {
                        hide: function () {
                            this.destroy();
                        }
                    }
                });
                msg.show({
                    title: Ext.isEmpty(msgTitle) ? LOC.ERROR : msgTitle,
                    msg: Ext.isEmpty(msgText) ? LOC.unknownError : msgText,
                    minWidth: 200,
                    modal: true,
                    icon: Ext.Msg.ERROR,
                    buttons: Ext.Msg.OK
                });
            },

            ShowSuccessMsg: function (msgTitle, msgText, msgPosition) {

                if (msgPosition == 'slider') {
                    dzz.COMPONENTS.slidingMsg.show(msgText);
                } else {
                    var msg = Ext.create('Ext.window.MessageBox', {
                        closeAction: 'destroy', listeners: {
                            hide: function () {
                                this.destroy()
                            }
                        }
                    });
                    msg.show({
                        title: Ext.isEmpty(msgTitle) ? LOC.INFO : msgTitle,
                        msg: msgText,
                        minWidth: 200,
                        modal: true,
                        icon: Ext.Msg.INFO,
                        buttons: Ext.Msg.OK
                    });
                }

            },

            //A global Ext.Ajax error handler
            ProcessAjaxExceptions: function (response) {

                if (!Ext.isEmpty(response.responseText)) {
                    var respObject = Ext.decode(response.responseText, true);

                    if (respObject == null) {
                        dzz.func.ShowErrorMsg('', '');
                        return;
                    }

                    if (respObject.success == true) {
                        return;
                    }

                    dzz.func.ShowErrorMsg(respObject.Title, respObject.Text);

                } else {
                    dzz.func.ShowErrorMsg('', LOC.noServerResponse);
                    return false;
                }

            }


        }
    );

});

