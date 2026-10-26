import os
import re
from typing import Any, Dict, List, Text

import requests
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet


API_BASE_URL = os.getenv("INNOVA_API_BASE_URL", "http://127.0.0.1:5000")


def _extract_customer_id(sender_id: Text) -> int | None:
    if not sender_id:
        return None
    digits = "".join(ch for ch in str(sender_id) if ch.isdigit())
    return int(digits) if digits else None


def _api_get(path: Text, params: Dict[str, Any] | None = None) -> Dict[str, Any]:
    response = requests.get(f"{API_BASE_URL}{path}", params=params, timeout=10)
    response.raise_for_status()
    return response.json()


def _latest_booking(bookings: List[Dict[str, Any]]) -> Dict[str, Any] | None:
    if not bookings:
        return None
    return bookings[0]


def _uses_tagalog(tracker: Tracker) -> bool:
    text = str(tracker.latest_message.get("text") or "").lower()
    return bool(re.search(
        r"\b(?:magkano|presyo|paano|saan|nasaan|ano|anong|may|ba|"
        r"puwede|pwede|tumatanggap|kuwarto|kwarto|silid|reserba|"
        r"booking ko|reservation ko|salamat|po)\b",
        text,
    ))


class ActionCheckRoomAvailability(Action):
    def name(self) -> Text:
        return "action_check_room_availability"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        customer_id = _extract_customer_id(tracker.sender_id)
        is_tagalog = _uses_tagalog(tracker)
        room_type = tracker.get_slot("room_type")
        guest_count = tracker.get_slot("guest_count")
        check_in = tracker.get_slot("check_in_date")
        check_out = tracker.get_slot("check_out_date")

        lookup_failed = False
        try:
          if customer_id:
              payload = _api_get(f"/api/innova/recommended/{customer_id}", params={"from": check_in, "to": check_out})
              rooms = payload.get("rooms", [])
          else:
              rooms = []
        except requests.RequestException:
          rooms = []
          lookup_failed = True

        if room_type:
            rooms = [room for room in rooms if room_type.lower() in str(room.get("name", "")).lower()]

        if rooms:
            top_rooms = ", ".join(room.get("name", "Suite") for room in rooms[:3])
            dispatcher.utter_message(
                text=(
                    f"Nakakita ako ng ilang kuwartong maaaring bagay sa iyo: {top_rooms}. Maaari kang magpatuloy sa reservation form."
                    if is_tagalog else
                    f"I found some room options you may like: {top_rooms}. You can continue to the reservation form."
                )
            )
        elif lookup_failed:
            dispatcher.utter_message(
                text=(
                    "Hindi ko masuri ang live availability ngayon. Tingnan ang Vision Suites para makita ang kasalukuyang mga kuwarto."
                    if is_tagalog else
                    "I couldn't check live availability right now. Open Vision Suites to view current rooms."
                )
            )
        else:
            message = "Matutulungan kitang suriin ang availability at pumili ng kuwarto" if is_tagalog else "I can help you check availability and choose a room"
            if room_type:
                message += f" para sa {room_type}" if is_tagalog else f" for a {room_type} stay"
            if guest_count:
                message += f" para sa {int(guest_count)} bisita" if is_tagalog else f" for {int(guest_count)} guest(s)"
            if check_in and check_out:
                message += f" mula {check_in} hanggang {check_out}" if is_tagalog else f" between {check_in} and {check_out}"
            dispatcher.utter_message(text=f"{message}.")

        return []


class ActionGetAmenities(Action):
    def name(self) -> Text:
        return "action_get_amenities"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        amenity = (tracker.get_slot("amenity") or "").lower()
        if _uses_tagalog(tracker):
            detail = f" tungkol sa {amenity}" if amenity else ""
            message = (
                f"Wala akong kumpirmadong detalye{detail} sa chat data. Tingnan ang amenities sa room listing o makipag-ugnayan sa hotel."
            )
        else:
            detail = f" about {amenity}" if amenity else ""
            message = (
                f"I don't have confirmed details{detail} in the chat data. Check the room listing or contact the hotel."
            )
        dispatcher.utter_message(text=message)
        return []


class ActionGetCheckinCheckoutInfo(Action):
    def name(self) -> Text:
        return "action_get_checkin_checkout_info"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        try:
            policy = _api_get("/api/vision/hotel")
        except requests.RequestException:
            dispatcher.utter_message(
                text=(
                    "Hindi ko makuha ang kasalukuyang check-in at check-out policy. Tingnan ang booking details o makipag-ugnayan sa hotel."
                    if _uses_tagalog(tracker) else
                    "I couldn't retrieve the current check-in and check-out policy. Check your booking details or contact the hotel."
                )
            )
            return []

        check_in = policy.get("checkInPolicy")
        check_out = policy.get("checkOutPolicy")
        policy_parts = []
        if check_in:
            policy_parts.append(f"Check-in: {check_in}")
        if check_out:
            policy_parts.append(f"Check-out: {check_out}")
        if policy_parts:
            message = " | ".join(policy_parts)
        else:
            message = (
                "Wala pang nakatalang check-in/check-out policy. Tingnan ang booking details o makipag-ugnayan sa hotel."
                if _uses_tagalog(tracker) else
                "No check-in/check-out policy is listed yet. Check your booking details or contact the hotel."
            )
        dispatcher.utter_message(text=message)
        return []


class ActionReservationAssistance(Action):
    def name(self) -> Text:
        return "action_reservation_assistance"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        is_tagalog = _uses_tagalog(tracker)
        room_type = tracker.get_slot("room_type")
        guest_count = tracker.get_slot("guest_count")
        check_in = tracker.get_slot("check_in_date")
        check_out = tracker.get_slot("check_out_date")

        parts = [
            "Matutulungan kitang pumili ng kuwarto bago magpatuloy sa reservation form."
            if is_tagalog else
            "I can help you choose a room before you continue to the reservation form."
        ]
        if room_type:
            parts.append(f"Nakitang room type: {room_type}." if is_tagalog else f"Room type: {room_type}.")
        if guest_count:
            parts.append(f"Bilang ng bisita: {int(guest_count)}." if is_tagalog else f"Guest count: {int(guest_count)}.")
        if check_in or check_out:
            parts.append(
                f"Petsa ng stay: {check_in or 'hindi pa itinakda'} hanggang {check_out or 'hindi pa itinakda'}."
                if is_tagalog else
                f"Stay dates: {check_in or 'not set'} to {check_out or 'not set'}."
            )

        dispatcher.utter_message(text=" ".join(parts))
        return []


class ActionGetDigitalKeyStatus(Action):
    def name(self) -> Text:
        return "action_get_digital_key_status"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        customer_id = _extract_customer_id(tracker.sender_id)
        is_tagalog = _uses_tagalog(tracker)
        if not customer_id:
            dispatcher.utter_message(
                text=(
                    "Mag-sign in muna para matingnan ang digital key status mo."
                    if is_tagalog else
                    "Please sign in first so I can check your digital key status."
                )
            )
            return []

        try:
            dashboard = _api_get(f"/api/customer/dashboard/{customer_id}")
            booking = _latest_booking(dashboard.get("user", {}).get("bookings", []))
            if not booking:
                dispatcher.utter_message(
                    text=(
                        "Magiging available ang digital key kapag may active at confirmed booking ka na."
                        if is_tagalog else
                        "Your digital key will be available once you have an active confirmed booking."
                    )
                )
                return []

            _api_get(f"/api/bookings/{booking['bookingId']}/digital-key", params={"customer_id": customer_id})
            dispatcher.utter_message(
                text=(
                    f"Active ang digital key para sa booking #INV-{booking['bookingId']}. Buksan ang Digital Key card sa dashboard at i-scan ang QR code para makapasok sa kuwarto."
                    if is_tagalog else
                    f"Your digital key is active for booking #INV-{booking['bookingId']}. Open the Digital Key card on your dashboard and scan the QR code for room access."
                )
            )
        except Exception:
            dispatcher.utter_message(
                text=(
                    "Hindi ko ma-verify ang digital key ngayon. Tingnan ang Digital Key card sa dashboard mo."
                    if is_tagalog else
                    "I couldn't verify your digital key right now. Check the Digital Key card on your dashboard."
                )
            )
        return []


class ActionGetLoyaltySummary(Action):
    def name(self) -> Text:
        return "action_get_loyalty_summary"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        customer_id = _extract_customer_id(tracker.sender_id)
        is_tagalog = _uses_tagalog(tracker)
        if not customer_id:
            dispatcher.utter_message(
                text=(
                    "Mag-sign in muna para makita ang loyalty points at rewards mo."
                    if is_tagalog else
                    "Please sign in first so I can fetch your loyalty points and rewards."
                )
            )
            return []

        try:
            payload = _api_get(f"/api/innova/summary/{customer_id}")
            dispatcher.utter_message(
                text=(
                    f"Mayroon kang {payload.get('points', 0)} loyalty points at {payload.get('tier', 'STANDARD')} tier."
                    if is_tagalog else
                    f"You currently have {payload.get('points', 0)} loyalty points and your tier is {payload.get('tier', 'STANDARD')}."
                )
            )
        except Exception:
            dispatcher.utter_message(
                text=(
                    "Hindi ko makuha ang loyalty summary mo ngayon. Subukan ulit mamaya."
                    if is_tagalog else
                    "I couldn't fetch your loyalty summary right now. Please try again later."
                )
            )
        return []


class ActionGetBookingPolicy(Action):
    def name(self) -> Text:
        return "action_get_booking_policy"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        latest_intent = tracker.latest_message.get("intent", {}).get("name")
        is_tagalog = _uses_tagalog(tracker)
        action = "baguhin" if latest_intent == "modify_booking" else "kanselahin"
        if is_tagalog:
            message = (
                f"Para {action} ang booking, mag-sign in sa /login at tingnan ang /customer/bookings. Depende sa booking at patakaran ng hotel ang mga pagbabago; tingnan ang booking details para sa mga opsyon."
                if not _extract_customer_id(tracker.sender_id) else
                f"Tingnan ang /customer/bookings para {action} ang booking mo. Depende sa booking at patakaran ng hotel ang mga opsyon."
            )
        else:
            message = (
                "Sign in at /login and open /customer/bookings to manage your reservation. Available changes depend on the booking and hotel policy; review the booking details for its options."
                if not _extract_customer_id(tracker.sender_id) else
                "Open /customer/bookings to manage your reservation. Available changes depend on the booking and hotel policy; review its details for the options."
            )
        dispatcher.utter_message(text=message)
        return []


class ActionCaptureGuestPreferences(Action):
    def name(self) -> Text:
        return "action_capture_guest_preferences"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        is_tagalog = _uses_tagalog(tracker)
        room_type = tracker.get_slot("room_type")
        guest_count = tracker.get_slot("guest_count")
        check_in = tracker.get_slot("check_in_date")
        check_out = tracker.get_slot("check_out_date")

        note_parts = []
        if room_type:
            note_parts.append(f"room type={room_type}")
        if guest_count:
            note_parts.append(f"guest_count={int(guest_count)}")
        if check_in:
            note_parts.append(f"check_in={check_in}")
        if check_out:
            note_parts.append(f"check_out={check_out}")

        if note_parts:
            dispatcher.utter_message(
                text=(
                    f"Naitala ko ang mga detalye ng gusto mo para makatulong sa guest experience: {', '.join(note_parts)}."
                    if is_tagalog else
                    f"I've noted your preferences to help with your guest experience: {', '.join(note_parts)}."
                )
            )
        return []


class ActionDefaultFallback(Action):
    def name(self) -> Text:
        return "action_default_fallback"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        dispatcher.utter_message(
            text=(
                "Matutulungan kita sa availability ng kuwarto, presyo, amenities, booking, at patakaran ng hotel. Ano ang gusto mong malaman?"
                if _uses_tagalog(tracker) else
                "I can help with room availability, rates, amenities, booking guidance, and hotel policies. What would you like to know?"
            )
        )
        return []
