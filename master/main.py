import image_capture
import image_process
import send_server as send
import date_hour as dh
import data_db
import time

#Capture the image with PiCamera
image_capture.get_img()
#time.sleep(10)
#print("Get image succesful!")

#Image processing OpenCV
image_process.flies_search()

#Send the image_master to server web -- this is a test -- this function is run in flies.search
#url_photo = 'Results/result_%s.png' %dh.date_hour_now()
#send.send_photo(url_photo)

#Query to send and delete db
data_db.query_select()
data_db.query_delete()

#The raspberry go to sleep
print("Rasp SLEEP!")
