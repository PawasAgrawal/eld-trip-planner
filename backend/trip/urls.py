from django.urls import path
from .views import plan_trip

urlpatterns = [
    path('trip/plan/', plan_trip),
]
