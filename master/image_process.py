#Funzioni per elaorazioni immagini.
#Pietro Rignanese 2017
#--------------------------------FliesFree-----------------------------

import cv2 as cv
import date_hour
import numpy as np
from matplotlib import pyplot as plt
import send_server

  #Function visual photo
def visual_photo():
    print("Photo:")
    img = cv.imread('Trap/%s.jpg' %date_hour.date_hour_now())
    cv.imshow('Scatto', img)
    cv.waitKey(0)
  
  #Flies Detect
def flies_search():
    print("Flies Detect")
    img_rgb = cv.imread('Trap/%s.jpg' %date_hour.date_hour_now())
    img_gray = cv.cvtColor(img_rgb, cv.COLOR_BGR2GRAY)
    template1 = cv.imread('Flies/mosca1.jpg',0)
    template2 = cv.imread('Flies/mosca2.jpg',0)
    w, h = template1.shape[::-1]
    w2, h2 = template2.shape[::-1]
    #----------The comparison takes place on two sample images----------
    res1 = cv.matchTemplate(img_gray,template1,cv.TM_CCOEFF_NORMED)
    res2 = cv.matchTemplate(img_gray,template2,cv.TM_CCOEFF_NORMED)
    threshold = 0.8
    loc = np.where( res1 >= threshold)#Matrix
    loc2 = np.where( res2 >= threshold)#Matrix
    
    num_mosche = 0 #flies number
    num_cicli = 0 #flies loop
    conf = 0 #Comparison variable to be able to count the number of rectangles
    
    #The areas where flies were found are highlighted
    for pt in zip(*loc[::-1]):
   #------Algoritm flies number-------     
        if num_cicli == 0:
            conf = pt[0]
            num_cicli = num_cicli + 1
            num_mosche = num_mosche + 1
        else:
            num_cicli = num_cicli + 1
            if (conf-30)<pt[0] and (conf+30)>pt[0]:
                conf = pt[0]
            else:
                num_mosche = num_mosche + 1
                conf = pt[0]
                
   #-----------------------------------------
        cv.rectangle(img_rgb, pt, (pt[0] + w, pt[1] + h), (0,0,255), 1)
        
    num_cicli = 0 #Set the number of cycles to zero to restart the count
    
    for pt2 in zip(*loc2[::-1]):
    #------Algortitmo conteggio mosche-------     
        if num_cicli == 0:
            conf = pt2[0]
            num_cicli = num_cicli + 1
            num_mosche = num_mosche + 1
        else:
            num_cicli = num_cicli + 1
            if (conf-30)<pt2[0] and (conf+30)>pt2[0]:
                conf = pt2[0]
            else:
                num_mosche = num_mosche + 1
                conf = pt2[0]
                
   #-----------------------------------------
        cv.rectangle(img_rgb, pt2, (pt2[0] + w2, pt2[1] + h2), (0,0,255), 1)
        
    #Save the image
    url_photo = "Results/result_%s.png"%date_hour.date_hour_now()   
    cv.imwrite(url_photo,img_rgb)
    print("Search complete!")
    print("Flies:")
    print(num_mosche)
    num_mosche = 0 #Rest the number of flies to zero for a future count

    send_server.send_photo(url_photo) 

