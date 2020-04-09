Ext.onReady(function () {

    var captions = dzz.i18n.txt[0];

    //the login form panel
    var loginFormPanel = Ext.create('Ext.form.Panel',
        {
            id: 'loginFrmPanel',
            preventHeader: true,
            url: 'php/doAction.php',
            bodyPadding: 25,
            bodyStyle: {background: 'transparent'},
            border: false,
            items: [
                {
                    xtype: 'textfield',
                    fieldLabel: captions['lblUser'],
                    id: 'userName',
                    name: 'userName',
                    allowBlank: false,
                    enableAutoComplete: true
                },
                {
                    xtype: 'textfield',
                    inputType: 'password',
                    fieldLabel: captions['lblPass'],
                    id: 'userPassword',
                    name: 'userPassword',
                    allowBlank: false
                },
                {
                    xtype: 'combobox',
                    id: 'localeCombo',
                    //name: dzz.i18n.localeParam,
                    fieldLabel: captions['lblLanguage'],
                    store: {
                        fields: ['val', 'name', 'class'],
                        data: [
                            {"val": "en", "name": "English", "class": "dzz-flag-en"},
                            {"val": "bg", "name": "Български", "class": "dzz-flag-bg"}
                        ]
                    },
                    queryMode: 'local', editable: false,
                    displayField: 'name',
                    valueField: 'val',
                    value: Ext.isEmpty(Ext.util.Cookies.get('dzz_UILang')) ? 'en' : Ext.util.Cookies.get('dzz_UILang'),
                    tpl: Ext.create('Ext.XTemplate',
                        '<tpl for=".">',
                        '<div class="x-boundlist-item"><div class="{class}">{name}</div></div>',
                        '</tpl>'
                    )
                    , listeners: {
                    change: function (combo) {
                        Ext.util.Cookies.set('dzz_UILang', combo.getValue());
                        window.location.reload();
                    },
                    afterrender: function (combo) {
                        var val = combo.getValue();
                        combo.inputEl.addCls('dzz-flag-' + val + '-displayField');
                    }
                }
                },
                {
                    xtype: 'combobox',
                    id: 'themeCombo',
                    fieldLabel: captions['lblUITheme'],
                    store: {
                        fields: ['val', 'name'],
                        data: [
                            {"val": "classic", "name": "Classic"},
                            {"val": "gray", "name": "Gray"},
                            {"val": "neptune", "name": "Neptune"},
                            {"val": "crisp", "name": "Crisp"},
                            {"val": "triton", "name": "Triton"}
                        ]
                    },
                    queryMode: 'local', editable: false,
                    displayField: 'name',
                    valueField: 'val',
                    value: Ext.isEmpty(Ext.util.Cookies.get('dzz_UITheme')) ? 'classic' : Ext.util.Cookies.get('dzz_UITheme'),
                    listeners: {
                        change: function (combo) {
                            Ext.util.Cookies.set('dzz_UITheme', combo.getValue());
                            window.location.reload();
                        }
                    }
                }
            ],
            buttons: [
                {
                    text: captions['btnLogin'],
                    //iconCls: 'dzz-icon-yes',
                    iconCls: 'fas fa-check', faIconColor: '#008000', scale: 'medium',
                    id: 'goLogin',
                    formBind: true,
                    listeners: {
                        click: function () {
                            if (!this.up('form').getForm().isValid()) {
                                return false;
                            }
                            this.up('form').getForm().submit(
                                {
                                    success: function (frm, action) {
                                        var frmPanel = Ext.getCmp('loginFrmPanel');

                                        Ext.getCmp('loginWindow').close();
                                        var redir = '../dzz';
                                        window.location.href = redir;
                                    },

                                    failure: function (frm, action) {
                                        if (action.result.Title && action.result.Text) {
                                            dzz.func.ShowErrorMsg(action.result.Title, action.result.Text);
                                        } else {
                                            dzz.func.ShowErrorMsg('ERROR', 'SERVER ERROR occured');
                                        }

                                    }
                                }
                            );
                        }

                    }

                },
                {
                    text: captions['btnCancel'],
                    //iconCls: 'dzz-icon-no',
                    iconCls: 'fas fa-times', faIconColor: '#ff0000', scale: 'medium',
                    handler: function () {
                        this.up('form').getForm().reset();
                    }
                }
            ]
        }
    );


    var loginWindow = Ext.create('Ext.window.Window',
        {
            id: 'loginWindow',
            title: captions['loginWinTitle'],
            modal: true,
            maximized: false,
            closable: false,
            resizable: false,
            items: [loginFormPanel]
        }
    );


    loginWindow.show().down('textfield[id=userName]').focus(false, 10);

    //simulate "click" event upon Enter keypress on the form
    loginFormPanel.mon(loginFormPanel.el, {
        keypress: function (e, t, opts) {
            if (e.getKey() == e.ENTER) {
                var btn = loginFormPanel.down('button[id=goLogin]');
                btn.fireEvent('click', btn);
            }
        }
    });


});