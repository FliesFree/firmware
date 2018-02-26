import image_capture
import image_process
import send_server as send
import date_hour as dh
import data_db


#Capture the image with PiCamera
image_capture.get_img()

#Image processing OpenCV
image_process.flies_search()

#Send the image_master to server web
url_photo = 'Results/result_%s.png' %dh.date_hour_now()
send.send_photo(url_photo)

#Query to send and delete db
data_db.query_select()
data_db.query_delete()

print("OFF state...")