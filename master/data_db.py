import MySQLdb
import base64
import date_hour
import time
import send_server

#Function SELECT and get the data in database
def query_select():
	controllo = 0 #Trigger ON/OFF --> Get the values only when this value is 1
	cod = 0 #Code's Shield
	ident = 0 #ID 
	contr = 0 #Controll to loop
	
	#Loop 10 minutes --> cycle until it finds controllo = 1
	for n in range(0,40):
		db = MySQLdb.connect(host="localhost",user="root",passwd="root",db="Logs")
		cur = db.cursor()
		cur.execute("SELECT id,onoff,codice FROM `11` WHERE onoff=1")
		for row in cur.fetchall():
			cod = row[2]
			controllo = row[1]
			ident = row[0]
		print(cod)
		print(controllo)
		print(ident)
		if cod > 0 and controllo == 1 and contr == 0:
			sql = "SELECT * FROM `11` WHERE id>1 and codice="
 			cod = repr(cod)
			sql = sql + cod	
			ident = repr(ident)
			ident = ident.replace("L","")
			sql2 = " and id<"+ident
			sql = sql + sql2
			print(sql)
			cur.execute(sql)
		
			image_64 = ""

			for row in cur.fetchall():
				if row[5]<>"0":
					image_64 = image_64 + row[5]
			image_64 = image_64.replace("_","/")
			image_64 = image_64.replace(".","=")
			image_64 = image_64 + "===="
			print(image_64)
			print(len(image_64))
			base_64_decode = base64.decodestring(image_64)
			url_photo_slave = "Results/result_slave_%s.png"%date_hour.date_hour_now()
			immagine = open(url_photo_slave,"wb")
			immagine.write(base_64_decode)
			immagine.close()
			#cur.execute("DELETE FROM `11` WHERE id>1")
			contr = 1
			print("Immagine elaborata!")
			send_server.send_photo(url_photo_slave)
		
		db.close()
		time.sleep(10)
	

#Functio query delete
def query_delete():
	db = MySQLdb.connect(host="localhost",user="root",passwd="root",db="Logs")

	cur = db.cursor()	
	sql = "DELETE FROM Logs.`11` WHERE `id`>1"
	try:
		cur.execute(sql)
		db.commit()
	except:
		db.rollback()

	db.close()
