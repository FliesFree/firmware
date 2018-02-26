import pycurl

def send_dongle(propr,dato):

	try:
		from urllib.parse import urlencode
	except:
		from urllib import urlencode

	c = pycurl.Curl()
	per = 'localhost:9600/apiomesh/send'
	c.setopt(c.URL, per)
	post_data = {'device':'11','property':propr,'value':dato}
	postfields = urlencode(post_data)
	c.setopt(c.POSTFIELDS, postfields)

	c.perform()
	c.close()
	print("---> Send Successful!")
