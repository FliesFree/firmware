import base64
import date_hour
import send_data
import time

#Fragment the image
def fragment(image):
	send_data.send_dongle("codice",1)
	#image = 'Risultati/result_2018_2_25_13.jpg'
#------------- ENCODE BASE 64 -----------
	image_64 = base64.encodestring(open(image,"rb").read())
	print(image_64)
	print(len(image_64)) #Lenght string in base64
	num = len(image_64) #Numero caratteri composti dall'immagine
	#num = 1000
	dec = 0 #Contatore per pacchettidi stringhe
	nuova_stringa = ""
#---LOOP TO SEND WITH DONGLE APIO----
	for n in range(0,num):
		print(n)
		time.sleep(0.25)
		if n > 0:
			dec = dec+70
			n = dec
			if n > num:
				break
			else:	
				print(n)
				m = n+70
				if m > num:
					print("m>num")
					m = num
					nuova_stringa = image_64[n:m].replace("/","_")
					nuova_stringa = nuova_stringa.replace("\n","")
					nuova_stringa = nuova_stringa.replace("=",".")
					print(nuova_stringa)
					send_data.send_dongle("image",nuova_stringa)
					#time.sleep(0.05)
				else:
					print("m<num")
					#print(m)
					nuova_stringa = image_64[n:m].replace("/","_")
					nuova_stringa = nuova_stringa.replace("\n","")
					nuova_stringa = nuova_stringa.replace("=",".")
					print(nuova_stringa)
					send_data.send_dongle("image",nuova_stringa)
					#time.sleep(0.05)
		else:
			print("n=0")
			print(n)
			m = n+70
			#print(m)
			nuova_stringa = image_64[n:m].replace("/","_")
			nuova_stringa = nuova_stringa.replace("\n","")
			nuova_stringa = nuova_stringa.replace("=",".")
			print(nuova_stringa)
			send_data.send_dongle("image",nuova_stringa)
			#time.sleep(0.05)


	print("------- Fragment Complete! ------")
	send_data.send_dongle("image","0")
	time.sleep(0.05)
	send_data.send_dongle("onoff","1")
	time.sleep(0.05)
	send_data.send_dongle("onoff","0")
