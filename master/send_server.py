import pycurl

#Send to Server Web
def send_photo(flies, url_photo):
    print(" -->  --> Send...")
    c = pycurl.Curl()
    server = "http://172.20.10.12/index.php/imgUp/8/1/"
    flies = repr(flies)
    server = server + flies
    c.setopt(c.URL, server)
    print("-- URL OK! --")
    c.setopt(c.HTTPPOST, [
        ('fileupload', (
            # upload the contents of this file
            c.FORM_FILE, url_photo,
	    #c.FORM_FILENAME, 'img',
            #c.FORM_CONTENTTYPE, 'image/png',
        )),
    ])

    c.perform()
    c.close()
    print(" +++++ Send complete! -----")
