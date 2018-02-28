import image_capture
import image_process
import date_hour as d
import image_frag
import time

#Cattura immagine tramite scatto con la PiCamera
image_capture.get_img()
#time.sleep(8)
#print("foto scattata")

#Elaora l'immagine con un algoritmo OpenCV
image_process.flies_search()

#Invia il risultato della foto alla master
#image_frag.fragment()


print("OFF State...")
