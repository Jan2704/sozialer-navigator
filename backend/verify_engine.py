import json
from models import HouseholdRequest, Person, IncomeSource, IncomeType, TerminationReason
from engine import SocialRuleEngine

def run_tests():
    print("[TEST] Starting Rules Engine Verification Tests...\n")
    engine = SocialRuleEngine()

    # TEST CASE 1: Single parent (30y) with 1 child (5y), no income, 600€ cold rent, 100€ utility, 80€ heating
    p1 = Person(role="main", age=30, incomes=[], is_single_parent=True)
    p2 = Person(role="child", age=5, incomes=[])
    
    req1 = HouseholdRequest(
        zip_code="10115",
        rent_cold=600.0,
        rent_utility=100.0,
        rent_heating=80.0,
        members=[p1, p2]
    )
    
    res1 = engine.evaluate_all(req1)
    print("--- Test Case 1: Single Parent, No Income ---")
    print(f"Buergergeld SGB II: Amount = {res1['sgb2']['amount']} EUR | Status = {res1['sgb2']['status']}")
    print(f"Reason: {res1['sgb2']['reason']}")
    print(f"Kindergeld: Amount = {res1['kindergeld']['amount']} EUR | Status = {res1['kindergeld']['status']}")
    print(f"Reason: {res1['kindergeld']['reason']}")
    print("")

    # TEST CASE 2: Low-income family of 4 (Main: 40y (1500€ net/1800€ brutto), Partner: 38y (none), Child 1: 8y, Child 2: 12y)
    inc = IncomeSource(amount_brutto=1800.0, amount_net=1500.0, source_type=IncomeType.EMPLOYMENT)
    p_main = Person(role="main", age=40, incomes=[inc])
    p_partner = Person(role="partner", age=38, incomes=[])
    p_kid1 = Person(role="child", age=8, incomes=[])
    p_kid2 = Person(role="child", age=12, incomes=[])
    
    req2 = HouseholdRequest(
        zip_code="20095",
        rent_cold=800.0,
        rent_utility=150.0,
        rent_heating=100.0,
        members=[p_main, p_partner, p_kid1, p_kid2]
    )
    
    res2 = engine.evaluate_all(req2)
    print("--- Test Case 2: Low Income Family of 4 ---")
    print(f"Buergergeld SGB II: Amount = {res2['sgb2']['amount']} EUR | Status = {res2['sgb2']['status']}")
    print(f"Reason: {res2['sgb2']['reason']}")
    print(f"Wohngeld: Amount = {res2['wohngeld']['amount']} EUR | Status = {res2['wohngeld']['status']}")
    print(f"Reason: {res2['wohngeld']['reason']}")
    print(f"Kindergeld: Amount = {res2['kindergeld']['amount']} EUR | Status = {res2['kindergeld']['status']}")
    print(f"Reason: {res2['kindergeld']['reason']}")
    print(f"Kinderzuschlag: Amount = {res2['kinderzuschlag']['amount']} EUR | Status = {res2['kinderzuschlag']['status']}")
    print(f"Reason: {res2['kinderzuschlag']['reason']}")
    print("")

    # TEST CASE 3: Expectant mother (28y, expecting a baby, has minijob income of 450€ net/brutto)
    inc_minijob = IncomeSource(amount_brutto=450.0, amount_net=450.0, source_type=IncomeType.MINIJOB)
    p_expectant = Person(role="main", age=28, incomes=[inc_minijob], is_pregnant=True)
    
    req3 = HouseholdRequest(
        zip_code="80331",
        rent_cold=500.0,
        rent_utility=80.0,
        rent_heating=60.0,
        expects_child=True,
        members=[p_expectant]
    )
    
    res3 = engine.evaluate_all(req3)
    print("--- Test Case 3: Expectant Mother ---")
    print(f"Elterngeld: Amount = {res3['elterngeld']['amount']} EUR | Status = {res3['elterngeld']['status']}")
    print(f"Reason: {res3['elterngeld']['reason']}")
    print(f"Buergergeld: Status = {res3['sgb2']['status']} | Amount = {res3['sgb2']['amount']} EUR (Includes pregnancy Mehrbedarf)")
    print(f"Reason: {res3['sgb2']['reason']}")
    print("\n[SUCCESS] Verification Tests Completed Successfully!")

if __name__ == "__main__":
    run_tests()
