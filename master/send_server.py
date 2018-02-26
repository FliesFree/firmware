import pycurl

#Send to Server Web
def send_photo(url_photo):
    print("Send...")
    c = pycurl.Curl()
    c.setopt(c.URL, '192.168.43.233/test/SlimApp/public/index.php')

    c.setopt(c.HTTPPOST, [
        ('fileupload', (
            # upload the contents of this file
            c.FORM_FILE, url_photo,
        )),
    ])

    c.perform()
    c.close()
    print("Send complete!")
