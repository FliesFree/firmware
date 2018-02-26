# Firmware Flies Free 

## Flies Free

Firmware to be installed on the Raspberry

Steps:
  * Install [ApioOS](https://github.com/ApioLab/ApioOS)
  * Install [firmware](https://github.com/ApioLab/ApioOS/wiki) in the dongles with Arduino IDE
  * Insert the [dongle](https://www.apio.cc/component/virtuemart/store_ita/prodotti/apio-dongle-1-4-detail) in a USB port of Rasp
  * Clone the GIT in the Raspberry:
      * `git clone https://github.com/FliesFree/firmware/master` MASTER
      * `git clone https://github.com/FliesFree/firmware/slave` SLAVE
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
      
      
Enjoi it!

FliesFree Firmware Pietro Rignanese ver. 1.0
