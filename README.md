# Orford_Patrouille

Main directives were :

I would like you to generate a simple general access point to then link to the different applications like Inspection, infraction and may be others.
With this general page I want to group the function of login, manage forgotten password and manage link depending on the access allowed to :
* An admin page (pulled out from inspection_Orford) for those who are admin and have access to all apps. This page is to manage the users only.
* Inspection_Orford
* Infractions_Orford
* And new ones which will come later like Signalisation
Main page I see a logo top left, a main title "Orford Patrouille" with the theme of the Inspection_Orford pages.
Below logo to login "connexion" (if not logged in)
once connected we have vertically few buttons to access the allowed web pages :
* "Inspection piste de rando"
* "Infraction"
* "Signalisation"
* log out "déconnexion".
I want to start build those pages without changing the current site in the repositories.
How do you see this and where do you think I should plaec it ? In one of the current repository (Inspection is the one holding most of the functions already) ? DO you have any questions which could help design and develop this ?


adde info :
Use the main logo from Inspection_Orford.
Use theme from Inspection which has the possibility to be changed quickly.
Stay on the portal app window and once user select and click on a link he stays in the same window.
Some feature will stay in the Inspetion_Orford some will move to the main. Everything related to user will move in the main portal. I want to have the same way to handle users as in Inspection_Orford + the possibility to modify a user by clicking on him to add telephone etc...
Signalisation will be a new app like Infraction and Inspection... will be done later
password management should be centralized in the main portal and should give access to both Change and Recovery
Be automatically authenticated (since same Firebase project). A user should be able to navigate through the different apps without logging out.