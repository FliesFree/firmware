# Firmware Flies Free 

## Flies Free

Firmware to be installed on the Raspberry<br>
All the details in the following reposity: https://github.com/FliesFree/FliesFree <br>

___________________________________________________________________________
## Scheme
<img src="https://github.com/FliesFree/firmware/blob/master/Scheme.png"/>

___________________________________________________________________________
Steps:
  * Install [ApioOS](https://github.com/ApioLab/ApioOS)
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
   * Change the IP to connect the web server:
      * `firmware/master/send_server.py`:
        
             #Send to Server Web
             def send_photo(url_photo):
               print(" -->  --> Send...")
               c = pycurl.Curl()
               c.setopt(c.URL, '-----CHANGE IP-----/------CHANGE URL------')
               print("-- URL OK! --")
               c.setopt(c.HTTPPOST, [
                 ('fileupload', (
                      # upload the contents of this file
                      c.FORM_FILE, url_photo,
                 )),
               ])
               
      * For the tests you can use my program made in Slim: https://drive.google.com/file/d/1-gjFlUtisgAeFyHhrSlG2WSVDSyHLBr0/view
        * Install [XAMPP](https://www.apachefriends.org/it/index.html)
        * Extract and import everything into `C:/xampp/htdocs`
        * Run XAMPP
         
   * Run the `main.py` in both shields
      
________________________________________________________________________

### Workflow:
https://github.com/FliesFree/firmware/blob/master/diagram.png

________________________________________________________________________
### Sleep&Wake
Raspberry Pi 3 + [Witty Pi 2](http://www.uugear.com/doc/WittyPi2_UserManual.pdf)

_________________________________________________________________________
### Cost
<img src="https://github.com/FliesFree/firmware/blob/master/Cost.png"/>

__________________________________________________________________________
      
Enjoi it!

<img src="https://github.com/FliesFree/FliesFree/blob/master/Foto/Logo/flies_free_logo.png"/>

FliesFree Firmware Pietro Rignanese ver. 1.0

Contacts: 
  * Mail: pietro_rignanese@hotmail.it --> Objects:FliesFree Information 
