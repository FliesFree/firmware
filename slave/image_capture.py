#Image Capture
#Pietro Rignanese 2017
#----------------------FliesFree---------------------------

import picamera  
import time
import date_hour 

def get_img():
    print("Get photo...")
    camera = picamera.PiCamera()
    camera.start_preview()
    camera.annotate_text = date_hour.date_hour_now()
    time.sleep(5)
    camera.resolution=(500,600)
    camera.capture('Trap/%s.jpg' % date_hour.date_hour_now())
    camera.stop_preview()
    print("Foto scattata.")