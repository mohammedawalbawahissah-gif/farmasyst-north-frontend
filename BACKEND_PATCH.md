# Backend Patch Required

The investor portal (Opportunities, Contracts, Browse Farmers) shows empty 
because the backend querysets don't filter by the logged-in investor.

Apply these changes to your Django backend:

## 1. credit/views.py — Fix investor queryset + add match/accept actions

In `CreditApplicationViewSet.get_queryset()`, the investor branch must return
applications where `matched_investor = request.user`:

```python
def get_queryset(self):
    user = self.request.user
    if user.role == 'admin':
        return CreditApplication.objects.all()
    elif user.role == 'farmer':
        return CreditApplication.objects.filter(farmer=user)
    elif user.role == 'investor':
        # Return applications matched to this investor
        return CreditApplication.objects.filter(matched_investor=user)
    return CreditApplication.objects.none()
```

Add these actions to `CreditApplicationViewSet`:

```python
@action(detail=False, methods=['get'])
def matched(self, request):
    """Returns applications matched to the logged-in investor."""
    apps = CreditApplication.objects.filter(
        matched_investor=request.user,
        status__in=['matched', 'approved']
    )
    serializer = self.get_serializer(apps, many=True)
    return Response(serializer.data)

@action(detail=True, methods=['post'])
def match(self, request, pk=None):
    """Admin assigns an application to an investor."""
    app = self.get_object()
    investor_id = request.data.get('investor')
    from django.contrib.auth import get_user_model
    User = get_user_model()
    try:
        investor = User.objects.get(id=investor_id, role='investor')
    except User.DoesNotExist:
        return Response({'error': 'Investor not found'}, status=400)
    app.matched_investor = investor
    app.status = 'matched'
    app.save()
    serializer = self.get_serializer(app)
    return Response(serializer.data)

@action(detail=True, methods=['post'])
def accept(self, request, pk=None):
    """Investor accepts a matched application — creates a CreditAgreement."""
    app = self.get_object()
    if app.matched_investor != request.user:
        return Response({'error': 'Not authorized'}, status=403)
    # Create agreement
    agreement = CreditAgreement.objects.create(
        application=app,
        investor=request.user,
        farmer=app.farmer,
        credit_type=app.credit_type,
        amount=app.amount_requested or 0,
        repayment_period_months=app.repayment_period_months or 12,
        status='pending_signature',
    )
    app.status = 'approved'
    app.save()
    from .serializers import CreditAgreementSerializer
    return Response(CreditAgreementSerializer(agreement).data)

@action(detail=True, methods=['post'])
def decline_match(self, request, pk=None):
    """Investor declines — resets to approved for re-matching."""
    app = self.get_object()
    app.matched_investor = None
    app.status = 'approved'
    app.save()
    serializer = self.get_serializer(app)
    return Response(serializer.data)
```

## 2. credit/models.py — Ensure matched_investor field exists

```python
class CreditApplication(models.Model):
    # ... existing fields ...
    matched_investor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='matched_applications'
    )
```
Run: `python manage.py makemigrations && python manage.py migrate`

## 3. CreditAgreementViewSet.get_queryset() — Filter by investor

```python
def get_queryset(self):
    user = self.request.user
    if user.role == 'admin':
        return CreditAgreement.objects.all()
    elif user.role == 'farmer':
        return CreditAgreement.objects.filter(farmer=user)
    elif user.role == 'investor':
        return CreditAgreement.objects.filter(investor=user)
    return CreditAgreement.objects.none()
```

## 4. profiles/views.py — Allow investors to read farmer profiles

In `FarmerProfileViewSet`, set:
```python
permission_classes = [IsAuthenticated]  # not IsAdminUser
```
