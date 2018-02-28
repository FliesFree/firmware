# Firmware Flies Free 

## Flies Free

Firmware to be installed on the Raspberry<br>
All the details in the following reposity: https://github.com/FliesFree/FliesFree <br>


Steps:
  * Install [ApioOS](https://github.com/ApioLab/ApioOS)
  * Install [firmware](https://github.com/ApioLab/ApioOS/wiki) in the dongles with Arduino IDE
  * Insert the [dongle](https://www.apio.cc/component/virtuemart/store_ita/prodotti/apio-dongle-1-4-detail) in a USB port of Rasp
  * Connect Rasp to WEB and Clone the GIT in the Raspberry:
      * `git clone https://github.com/FliesFree/firmware`
      * Use the directory `master` to Raspberry Master and directory `slave` to Rasp Slave
  * Enable and install the camera PI:
      * `sudo apt-get update`
      * `sudo apt-get upgrate`
      * `sudo raspi-config`
      * Enable the camera
      * Test the camera:
        * `sudo raspistill -o image.jpg`
      * `sudo apt-get install python-picamera python3-picamera python-rpi.gpio`
   * Install the OpenCV:
      * `sudo apt-get install python-numpy`
      * `sudo apt-get install python-opencv`
      * `sudo apt-get install python-scipy`
      * `sudo apt-get install ipython`
   * Install PycURL:
      * `sudo apt-get install python-pycurl`
   * Install Matplotlib:
      * `sudo apt-get install python-matplotlib`
   * Install MySQL:
      * `sudo apt-get install mysqldb`
      
### Workflow:
https://github.com/FliesFree/firmware/blob/master/diagram.png
      
Enjoi it!

<img src="https://github.com/FliesFree/FliesFree/blob/master/Foto/Logo/flies_free_logo.png"/>

FliesFree Firmware Pietro Rignanese ver. 1.0

Contacts: 
  * Mail: pietro_rignanese@hotmail.it --> Objects:FliesFree Information 
