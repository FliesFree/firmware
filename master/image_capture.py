#Image Capture
#Pietro Rignanese 2017
#----------------------FliesFree---------------------------

from picamera import PiCamera 
import time
import date_hour 

def get_img():
    print("Get photo...")
    camera = PiCamera()
    camera.start_preview()
    camera.annotate_text = data_ora.data_ora_attuale()
    time.sleep(5)
    camera.capture('Trap/%s.jpg' % date_hour.date_hour_now())
    camera.stop_preview()
    print("Photo OK!")
