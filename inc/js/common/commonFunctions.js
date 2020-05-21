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

            },

            //2020-05-20: uses XHR to convert an image URL to a dataURL - https://stackoverflow.com/questions/6150289/how-can-i-convert-an-image-into-base64-string-using-javascript
            //Seems that there are 2 methods available for getting a base64-encoded string for a given image (from its real url)
            //One of them involves using a canvas element, which does not make an additional server request, but does not preserve the image meta data, so it is useless in ou case
            //The second approach (which we use), performs an Ajax call and FileReader's onloadend event to produce the dataUrl
            //The disadvantage is the additionl server call for the image, but for now this is our solution
            //The result is handled via the callback function which we supply via the dzz.func.imgToDataURL() call within commonComonents.js
            imgToDataURL: function (url, callback) {
                var xhr = new XMLHttpRequest();
                xhr.onload = function () {
                    var reader = new FileReader();
                    reader.onloadend = function () {
                        callback(reader.result);
                    }
                    reader.readAsDataURL(xhr.response);
                };
                xhr.open('GET', url);
                xhr.responseType = 'blob';
                xhr.send();
            },

            //2020-05-20: converts a base64/dataURL string to an Blob Javascript object - https://stackoverflow.com/questions/23150333/html5-javascript-dataurl-to-blob-blob-to-dataurl
            imgDataUrlToBlob: function (dataurl) {
                var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
                    bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
                while (n--) {
                    u8arr[n] = bstr.charCodeAt(n);
                }
                return new Blob([u8arr], {type: mime});
            },

            //2020-05-20: uses the Blob object to create an ArrayBuffer, which is used by the exifReader library
            //to extract the metadata
            imgBlobToExifData: function (blob, cmp, callback) {

                var reader = new FileReader();

                reader.onload = function (readerEvent) {
                    try {
                        var tags = ExifReader.load(readerEvent.target.result, {expanded: true}); //expanded property produces separate properties in the output (file, Thumbnail, gps, exif)
                        //    window.exifReaderListTags(tags);
                        //console.log(tags);
                        callback(cmp, {success: true, data: tags});


                    } catch (error) {
                        //      window.exifReaderError(error.toString());
                        //console.log(error.toString());
                        callback(cmp, {success: false, msg: error.toString()});
                    }
                };

                reader.readAsArrayBuffer(blob);
            }


        }
    );


});

