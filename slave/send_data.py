import pycurl
from urllib import urlencode
import time

def send_dongle(propr,dato):
	i = 0
	while i == 0:
		c = pycurl.Curl()
		per = 'localhost:9600/apiomesh/send'
		c.setopt(c.URL, per)
		post_data = {'device':'11','property':propr,'value':dato}
		postfields = urlencode(post_data)
		c.setopt(c.POSTFIELDS, postfields)
	
		try:
			c.perform()
			print(" ---> Send Succesful!")
			i = 1
		except pycurl.error:
			print("Errore!!!")
			print(dato)
			i = 0
			print("2 minuti di attesa...")
			time.sleep(120)
		
		c.close()
		
