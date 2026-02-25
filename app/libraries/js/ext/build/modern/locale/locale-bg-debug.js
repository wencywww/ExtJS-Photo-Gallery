Ext.define('Ext.locale.bg.ux.colorpick.Selector', {
    override: 'Ext.ux.colorpick.Selector',

    okButtonText: 'OK',
    cancelButtonText: 'Отказ'
});
// This is needed until we can refactor all of the locales into individual files
Ext.define("Ext.locale.bg.Component", {
    override: "Ext.Component"
});
Ext.define('Ext.locale.bg.Dialog', {
    override: 'Ext.Dialog',

    config: {
        maximizeTool: {
            tooltip: 'Максимизиране'
        },
        restoreTool: {
            tooltip: 'Възстановяване на размера'
        }
    }
});
Ext.define('Ext.locale.bg.LoadMask', {
    override: 'Ext.LoadMask',

    config: {
        message: 'Зареждане...'
    }
});
Ext.define('Ext.locale.bg.Panel', {
    override: 'Ext.Panel',

    config: {
        standardButtons: {
            ok: {
                text: 'ОК'
            },
            abort: {
                text: 'Откажи'
            },
            retry: {
                text: 'Повтори'
            },
            ignore: {
                text: 'Пропусни'
            },
            yes: {
                text: 'Да'
            },
            no: {
                text: 'Не'
            },
            cancel: {
                text: 'Отказ'
            },
            apply: {
                text: 'Приложи'
            },
            save: {
                text: 'Запис'
            },
            submit: {
                text: 'Изпращане'
            },
            help: {
                text: 'Помощ'
            },
            close: {
                text: 'Затвори'
            }
        },
        closeToolText: 'Затваряне панел'
    }
});
Ext.define('Ext.locale.bg.data.validator.Bound', {
    override: 'Ext.data.validator.Bound',

    config: {
        emptyMessage: 'Задължително поле',
        minOnlyMessage: 'Стойността трябва да е по-голяма от {0}',
        maxOnlyMessage: 'Стойността трябва да е по-малка от {0}',
        bothMessage: 'Стойността трябва да е между {0} и {1}'
    }
});
Ext.define('Ext.locale.bg.data.validator.CIDRv4', {
    override: 'Ext.data.validator.CIDRv4',

    config: {
        message: 'Невалиден CIDR блок'
    }
});
Ext.define('Ext.locale.bg.data.validator.CIDRv6', {
    override: 'Ext.data.validator.CIDRv6',

    config: {
        message: 'Невалиден CIDR блок'
    }
});
Ext.define('Ext.locale.bg.data.validator.Currency', {
    override: 'Ext.data.validator.Currency',

    config: {
        message: 'Невалидно количество валута'
    }
});
Ext.define('Ext.locale.bg.data.validator.Date', {
    override: 'Ext.data.validator.Date',

    config: {
        message: 'Невалиден формат за дата'
    }
});
Ext.define('Ext.locale.bg.data.validator.DateTime', {
    override: 'Ext.data.validator.DateTime',

    config: {
        message: 'Невалидни дата и време'
    }
});
Ext.define('Ext.locale.bg.data.validator.Email', {
    override: 'Ext.data.validator.Email',

    config: {
        message: 'Невалиден e-mail адрес'
    }
});
Ext.define('Ext.locale.bg.data.validator.Exclusion', {
    override: 'Ext.data.validator.Exclusion',

    config: {
        message: 'Е непозволена стойност'
    }
});
Ext.define('Ext.locale.bg.data.validator.Format', {
    override: 'Ext.data.validator.Format',

    config: {
        message: 'Невалиден формат'
    }
});
Ext.define('Ext.locale.bg.data.validator.IPAddress', {
    override: 'Ext.data.validator.IPAddress',

    config: {
        message: 'Некоректен IP-адрес'
    }
});
Ext.define('Ext.locale.bg.data.validator.Inclusion', {
    override: 'Ext.data.validator.Inclusion',

    config: {
        message: 'Е непозволена стойност'
    }
});
Ext.define('Ext.locale.bg.data.validator.Length', {
    override: 'Ext.data.validator.Length',

    config: {
        minOnlyMessage: 'Дължината не може да е по-малка от {0}',
        maxOnlyMessage: 'Дължината не може да е повече от {0}',
        bothMessage: 'Дължината трябва да е между {0} и {1}'
    }
});
Ext.define('Ext.locale.bg.data.validator.Number', {
    override: 'Ext.data.validator.Number',

    config: {
        message: 'Невалиден формат на числото'
    }
});
Ext.define('Ext.locale.bg.data.validator.Phone', {
    override: 'Ext.data.validator.Phone',

    config: {
        message: 'Невалиден номер телефон'
    }
});
Ext.define('Ext.locale.bg.data.validator.Presence', {
    override: 'Ext.data.validator.Presence',

    config: {
        message: 'Задължително за попълване'
    }
});
Ext.define('Ext.locale.bg.data.validator.Range', {
    override: 'Ext.data.validator.Range',

    config: {
        nanMessage: 'Стойността трябва да е числова',
        minOnlyMessage: 'Стойността не може да е по-малка от {0}',
        maxOnlyMessage: 'Стойността не може да е по-голяма от {0}',
        bothMessage: 'Стойността трябва да е между {0} и {1}'
    }
});
Ext.define('Ext.locale.bg.data.validator.Time', {
    override: 'Ext.data.validator.Time',

    config: {
        message: 'Некоректен формат за време'
    }
});
Ext.define('Ext.locale.bg.data.validator.Url', {
    override: 'Ext.data.validator.Url',

    config: {
        message: 'Невалиден URL-адрес'
    }
});
Ext.define('Ext.locale.bg.dataview.Abstract', {
    override: 'Ext.dataview.Abstract',

    config: {
        loadingText: 'Зареждане...'
    }
});
Ext.define('Ext.locale.bg.dataview.DataView', {
    override: 'Ext.dataview.DataView',

    config: {
        emptyText: ''
    }
});
Ext.define('Ext.locale.bg.dataview.EmptyText', {
    override: 'Ext.dataview.EmptyText',

    config: {
        html: 'Няма данни за показване'
    }
});
Ext.define('Ext.locale.bg.dataview.List', {
    override: 'Ext.dataview.List',

    config: {
        loadingText: 'Зареждане...'
    }
});
Ext.define('Ext.locale.bg.dataview.plugin.ListPaging', {
    override: 'Ext.dataview.plugin.ListPaging',

    config: {
        loadMoreText: 'Зареждане на още записи...',
        noMoreRecordsText: 'Няма повече записи'
    }
});
/**
 * Russian translation
 * By Maria Vlasyuk
 * 03.12.2018
 */
Ext.onReady(function () {

    if (Ext.Date) {
        Ext.Date.monthNames = ['Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни', 'Юли',
            'Август', 'Септември', 'Октомври', 'Ноември', 'Декември'];

        Ext.Date.defaultFormat = 'd.m.Y';
        Ext.Date.defaultTimeFormat = 'H:i';

        Ext.Date.getShortMonthName = function (month) {
            if ([0, 3, 4, 7, 9, 11].indexOf(month)) {
                return Ext.Date.monthNames[month].substring(0, 2);
            }

            return Ext.Date.monthNames[month].substring(0, 3);
        };

        Ext.Date.monthNumbers = {
            'Яну': 0,
            'Фев': 1,
            'Мар': 2,
            'Апр': 3,
            'Май': 4,
            'Юни': 5,
            'Юли': 6,
            'Авг': 7,
            'Сеп': 8,
            'Окт': 9,
            'Ное': 10,
            'Дек': 11
        };

        Ext.Date.getMonthNumber = function (name) {
            return Ext.Date.monthNumbers[name.substring(0, 1).toUpperCase() + name.substring(1, 3)
                .toLowerCase()];
        };

        Ext.Date.dayNames = ['Неделя', 'Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък',
            'Събота'];

        Ext.Date.getShortDayName = function (day) {
            if (day === 1) {
                return "Пон";
            }

            return Ext.Date.dayNames[day].substring(0, 3);
        };
    }

    if (Ext.util && Ext.util.Format) {
        Ext.apply(Ext.util.Format, {
            thousandSeparator: '.',
            decimalSeparator: ',',
            currencySign: '\u043b\u0432',
            // Bulgarian lev
            dateFormat: 'd.m.Y'
        });
    }
});

Ext.define('Ext.locale.bg.field.Date', {
    override: 'Ext.field.Date',

    minDateMessage: 'Датата в полето трябва да е равна или след {0}',
    maxDateMessage: 'Датата в полето трябва да е равна или преди {0}'
});
Ext.define('Ext.locale.bg.field.Field', {
    override: 'Ext.field.Field',

    config: {
        requiredMessage: 'Задължително поле',
        validationMessage: 'Невалиден формат'
    }
});
Ext.define('Ext.locale.bg.field.FileButton', {
    override: 'Ext.field.FileButton',

    config: {
        text: 'Избор...'
    }
});
Ext.define('Ext.locale.bg.field.Number', {
    override: 'Ext.field.Number',

    decimalsText: 'Максимален брой знаци след десетичната точка: {0}',
    minValueText: 'Стойността в полето не може да е по-малка от {0}',
    maxValueText: 'Стойността в полето не може да е по-голяма от {0}',
    badFormatMessage: 'Невалиден формат за числото'
});
Ext.define('Ext.locale.bg.field.Text', {
    override: 'Ext.field.Text',

    badFormatMessage: 'Невалиден формат на стойността',
    config: {
        requiredMessage: 'Задължително поле',
        validationMessage: 'Невалиден формат'
    }
});
Ext.define("Ext.locale.bg.grid.filters.menu.Base", {
    override: "Ext.grid.filters.menu.Base",

    config: {
        text: "Филтър"
    }
});
Ext.define("Ext.locale.bg.grid.locked.Grid", {
    override: 'Ext.grid.locked.Grid',

    config: {
        columnMenu: {
            items: {
                region: {
                    text: 'регион'
                }
            }
        },
        regions: {
            left: {
                menuLabel: 'Блокирано (вляво)'
            },
            center: {
                menuLabel: 'отключено'
            },
            right: {
                menuLabel: 'Блокирано (вдясно)'
            }
        }
    }
});
Ext.define('Ext.locale.bg.grid.menu.Columns', {
    override: 'Ext.grid.menu.Columns',

    config: {
        text: 'Колони'
    }
});
Ext.define('Ext.locale.bg.grid.menu.GroupByThis', {
    override: 'Ext.grid.menu.GroupByThis',

    config: {
        text: 'Групиране по това поле'
    }
});
Ext.define('Ext.locale.bg.grid.menu.ShowInGroups', {
    override: 'Ext.grid.menu.ShowInGroups',

    config: {
        text: 'Показване в групи'
    }
});
Ext.define('Ext.locale.bg.grid.menu.SortAsc', {
    override: 'Ext.grid.menu.SortAsc',

    config: {
        text: 'Сортиране в нарастващ ред'
    }
});
Ext.define('Ext.locale.bg.grid.menu.SortDesc', {
    override: 'Ext.grid.menu.SortDesc',

    config: {
        text: 'Сортиране в обратен ред'
    }
});
Ext.define("Ext.locale.bg.grid.plugin.RowDragDrop", {
    override: "Ext.grid.plugin.RowDragDrop",
    dragText: "{0} избрани редове"
});
Ext.define('Ext.locale.bg.panel.Collapser', {
    override: 'Ext.panel.Collapser',

    config: {
        collapseToolText: 'Свиване на панела',
        expandToolText: 'Разтягане на панела'
    }
});
Ext.define('Ext.locale.bg.panel.Date', {
    override: 'Ext.panel.Date',

    config: {
        nextText: 'Следващ месец (Control + ►)',
        prevText: 'Предишен месец (Control + ◄)',
        buttons: {
            footerTodayButton: {
                text: 'Днес'
            }
        }
    }
});
Ext.define('Ext.locale.bg.picker.Date', {
    override: 'Ext.picker.Date',

    config: {
        doneButton: 'Готово',
        monthText: 'Месец',
        dayText: 'Ден',
        yearText: 'Година'
    }
});
Ext.define('Ext.locale.bg.picker.Picker', {
    override: 'Ext.picker.Picker',

    config: {
        doneButton: 'Потвърди',
        cancelButton: 'Отказ'
    }
});
