#Image Capture
#Pietro Rignanese 2017
#----------------------FliesFree---------------------------

from picamera import PiCamera 
import time
import date_hour 

#Take a picture
def get_img():
    print(" -+-+-+- Get photo +-+-+-")
    camera = PiCamera()
    camera.start_preview()
    camera.annotate_text = date_hour.date_hour_now()
    time.sleep(5)
    camera.capture('Trap/%s.jpg' % date_hour.date_hour_now()) #the photo will be renamed based on the time
    camera.stop_preview()
    print("--- Photo OK! ---")
