FridgeWise UI code (design source files)

epic1-account-access/        Sign in, sign up, forgot password (OTP), new password, change password
epic2-kitchens-sharing/      Kitchen switcher, create, invite, join, members, transfer ownership, activity
epic3-inventory-quick-entry/ Home, item detail, recently removed, add item, custom item, item form, quick-add

In each folder, Main.dc.html is the first screen.
AppSidebar, KitchenBar and BrandPanel are shared pieces used inside other screens.

These are design-canvas source files (.dc.html). The markup and styles are plain
HTML with inline CSS, so you can copy them into React components. They will NOT
render if you just double-click them, because they need the canvas runtime
(support.js) and use its tags:
  <dc-import name="X">  = include the component X.dc.html
  <sc-for> / <sc-if>    = loop / condition
  {{value}}             = a value from renderVals() in the script at the bottom
Fonts: Baloo 2 (headings) and Nunito (body), from Google Fonts.
