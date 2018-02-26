import datetime

i = datetime.datetime.now()

def date_hour_now():    
    data_day = "%s_%s_%s_%s"%(i.year,i.month,i.day,i.hour)
    return data_day

def hour_now():
    return "%s_%s_%s_%s" %(i.hour)

def date_now():
    return "%s_%s_%s_%s" %(i.year,i.month,i.day)