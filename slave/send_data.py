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
			print("ERROR!!!")
			print(dato)
			print(" ******* RESEND THE STRING ******")
			i = 0
			print("-+-+-+-+-+-+- A few minutes waiting to reset the dongle -+-+-+-+-+-+-+")
			print("---")
			time.sleep(10)
			print("---------")
			time.sleep(15)
			print("-------------------")
			time.sleep(15)
			print("------------------------------------")
			time.sleep(20)
			print("\/\/\/\/\/\/\/\/\ ONE MINUTE \/\/\/\/\/\/\/")
			time.sleep(20)
			print("------------------------------------------------")
			time.sleep(20)
			print("-----------------------------------------------------------")
			time.sleep(20)
			print("----------- RESEND NOW ------> -----> --->")
			time.sleep(2)
		
		c.close()
		
