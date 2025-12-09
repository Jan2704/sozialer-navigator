from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from enum import Enum

class IncomeType(str, Enum):
    EMPLOYMENT = "employment"
    MINIJOB = "minijob"
    SELF_EMPLOYED = "self_employed"
    PENSION = "pension"
    CHILD_BENEFIT = "child_benefit"
    MAINTENANCE = "maintenance"
    NONE = "none"

class TerminationReason(str, Enum):
    FIRED = "fired"
    MUTUAL_AGREEMENT = "mutual_agreement"
    SELF_TERMINATION = "self_termination"
    NONE = "none"

class IncomeSource(BaseModel):
    amount_brutto: float = 0.0
    amount_net: float = 0.0
    source_type: IncomeType = IncomeType.NONE

class Person(BaseModel):
    id: str = "main"
    role: Literal["main", "partner", "child"]
    age: int = 0
    incomes: List[IncomeSource] = []
    
    is_student: bool = False
    is_pregnant: bool = False
    is_single_parent: bool = False

class HouseholdRequest(BaseModel):
    zip_code: str = "10115"
    
    # HIER WAR DER FEHLER: Dieses Feld muss existieren!
    city_tier: Optional[int] = None 
    
    rent_cold: float = 0.0
    rent_utility: float = 0.0
    rent_heating: float = 0.0
    
    termination_reason: TerminationReason = TerminationReason.NONE
    months_unemployed: int = 0 
    
    members: List[Person]