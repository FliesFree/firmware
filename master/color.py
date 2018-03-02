#Color Class to change the background

class bcolors:
		DEFAULT = '\033[0m'
		WHITE = '\033[47m'
		BLACK = '\033[40m'
                HEADER = '\033[95m'
                BLUE = '\033[94m'
                ENDC = '\033[1m'
                YELLOW = '\033[93m'
		RED = '\033[41m'
		GREEN = '\033[92m'

		UNDERLINE = '\033[4m'
		BOLD = '\033[1m'

def pr_blue(stringa):
	print bcolors.BLUE + stringa + bcolors.ENDC
	
def pr_yellow(stringa):
        print bcolors.YELLOW + stringa + bcolors.ENDC

def pr_red(stringa):
        print bcolors.RED + stringa + bcolors.ENDC

def pr_black(stringa):
        print bcolors.BLACK + stringa + bcolors.ENDC

def pr_white(stringa):
        print bcolors.WHITE + stringa + bcolors.ENDC

def pr_green(stringa):
        print bcolors.GREEN + stringa + bcolors.ENDC

def pr_magenta(stringa):
        print bcolors.HEADER + stringa + bcolors.ENDC

def pr_default(stringa):
	print bcolors.DEFAULT + stringa + bcolors.ENDC
